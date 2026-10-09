import type { SlangRelease } from "../constants.js";
import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  SlangConfig,
  SlangUserConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatConfigValidationError,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import {
  greaterThanOrEqual,
  lowerThanOrEqual,
  parseVersion,
} from "@nomicfoundation/hardhat-utils/fast-semver";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  conditionalUnionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import {
  DEFAULT_SLANG_OPTIMIZER_MODE,
  SLANG_COMPILER_TYPE,
  SLANG_RELEASES,
  SUPPORTED_SLANG_EVM_VERSIONS,
  SUPPORTED_SLANG_OPTIMIZER_MODES,
} from "../constants.js";
import { addSlangStackTraceSelectors } from "../slang-compiler.js";

const log = createDebug("hardhat:slang:hook-handlers:config");

// These zod types need to be aligned in shape with the ones of the solidity
// builtin plugin, but don't need to revalidate everything.

const KNOWN_SLANG_VERSIONS = Object.keys(SLANG_RELEASES);

const supportedEvmVersionsType = z
  .string()
  .refine((val) => SUPPORTED_SLANG_EVM_VERSIONS.includes(val), {
    message: `Slang only supports EVM versions: ${SUPPORTED_SLANG_EVM_VERSIONS.join(", ")}`,
  });

const supportedOptimizerModesType = z
  .string()
  .refine((val) => SUPPORTED_SLANG_OPTIMIZER_MODES.includes(val), {
    message: `Slang only supports optimizer modes: ${SUPPORTED_SLANG_OPTIMIZER_MODES.join(", ")}`,
  });

const slangSolidityCompilerUserConfigType = z
  .object({
    version: z.string(),
    settings: z
      .object({
        evmVersion: supportedEvmVersionsType.optional(),
        optimizer: z
          .object({
            mode: supportedOptimizerModesType.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const solidityCompilerUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) && "type" in data && data.type === SLANG_COMPILER_TYPE,
      slangSolidityCompilerUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a valid compiler configuration",
);

const singleVersionSolidityUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) && "type" in data && data.type === SLANG_COMPILER_TYPE,
      slangSolidityCompilerUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a valid single-version Solidity configuration",
);

const multiVersionSolidityUserConfigType = z.object({
  compilers: z.array(solidityCompilerUserConfigType).nonempty(),
  overrides: z.record(z.string(), solidityCompilerUserConfigType).optional(),
});

const singleVersionBuildProfileUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) && "type" in data && data.type === SLANG_COMPILER_TYPE,
      slangSolidityCompilerUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a valid compiler configuration",
);

const multiVersionBuildProfileUserConfigType = z.object({
  compilers: z.array(solidityCompilerUserConfigType).nonempty(),
  overrides: z.record(z.string(), solidityCompilerUserConfigType).optional(),
});

const buildProfilesSolidityUserConfigType = z.object({
  profiles: z.record(
    z.string(),
    conditionalUnionType(
      [
        [
          (data) => isObject(data) && "version" in data,
          singleVersionBuildProfileUserConfigType,
        ],
        [
          (data) => isObject(data) && "compilers" in data,
          multiVersionBuildProfileUserConfigType,
        ],
      ],
      "Expected an object configuring one or more versions of Solidity",
    ),
  ),
});

const solidityUserConfigType = conditionalUnionType(
  [
    [
      (data) => isObject(data) && "version" in data,
      singleVersionSolidityUserConfigType,
    ],
    [
      (data) => isObject(data) && "compilers" in data,
      multiVersionSolidityUserConfigType,
    ],
    [
      (data) => isObject(data) && "profiles" in data,
      buildProfilesSolidityUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a version string, an array of version strings, or an object configuring one or more versions of Solidity or multiple build profiles",
);

const slangVersionType = z.string().superRefine((version, ctx) => {
  if (!(version in SLANG_RELEASES)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown slang version "${version}". Known slang releases: ${KNOWN_SLANG_VERSIONS.join(", ")}`,
    });
  }
});

const slangUserConfigType = z
  .object({
    solidity: solidityUserConfigType.optional(),
    slang: z
      .object({
        version: slangVersionType.optional(),
        dangerouslyAllowSlangInProduction: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const entries = collectSlangEntriesToDownload(config.solidity);
    if (entries.length === 0) {
      return;
    }

    const pinnedVersion = config.slang?.version;
    if (pinnedVersion === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slang", "version"],
        message: `slang.version is required when a compiler entry uses type: "${SLANG_COMPILER_TYPE}" without a custom path. Known slang releases: ${KNOWN_SLANG_VERSIONS.join(", ")}`,
      });
      return;
    }

    const release = SLANG_RELEASES[pinnedVersion];
    if (release === undefined) {
      // Already reported by slangVersionType.
      return;
    }

    for (const { version, path } of entries) {
      if (!isSolidityVersionSupportedBy(version, release)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, "version"],
          message: `Solidity version ${version} is not supported by slang ${pinnedVersion}, which supports versions from ${release.minSolidity} to ${release.maxSolidity}`,
        });
      }
    }
  });

interface SlangEntryToDownload {
  version: string;
  path: Array<string | number>;
}

/**
 * Collects every compiler entry with `type: "slang"` and no custom `path`
 * from any of the shapes `solidity` can take, along with the config path of
 * the entry, so that errors point at the right place.
 */
function collectSlangEntriesToDownload(
  solidity: unknown,
): SlangEntryToDownload[] {
  const entries: SlangEntryToDownload[] = [];

  function visit(entry: unknown, path: Array<string | number>): void {
    if (
      !isObject(entry) ||
      entry.type !== SLANG_COMPILER_TYPE ||
      (typeof entry.path === "string" && entry.path.length > 0)
    ) {
      return;
    }
    entries.push({ version: String(entry.version), path });
  }

  function visitVersionsConfig(
    versionsConfig: unknown,
    path: Array<string | number>,
  ): void {
    if (!isObject(versionsConfig)) {
      return;
    }
    if ("version" in versionsConfig) {
      visit(versionsConfig, path);
      return;
    }
    if (Array.isArray(versionsConfig.compilers)) {
      versionsConfig.compilers.forEach((compiler, i) =>
        visit(compiler, [...path, "compilers", i]),
      );
    }
    if (isObject(versionsConfig.overrides)) {
      for (const [key, override] of Object.entries(versionsConfig.overrides)) {
        visit(override, [...path, "overrides", key]);
      }
    }
  }

  if (isObject(solidity) && isObject(solidity.profiles)) {
    for (const [name, profile] of Object.entries(solidity.profiles)) {
      visitVersionsConfig(profile, ["solidity", "profiles", name]);
    }
  } else {
    visitVersionsConfig(solidity, ["solidity"]);
  }

  return entries;
}

function isSolidityVersionSupportedBy(
  version: string,
  release: SlangRelease,
): boolean {
  const parsed = parseVersion(version);
  const min = parseVersion(release.minSolidity);
  const max = parseVersion(release.maxSolidity);

  assertHardhatInvariant(
    min !== undefined && max !== undefined,
    `The slang release table has an invalid Solidity range: ${release.minSolidity} to ${release.maxSolidity}`,
  );

  return (
    parsed !== undefined &&
    greaterThanOrEqual(parsed, min) &&
    lowerThanOrEqual(parsed, max)
  );
}

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
  validateResolvedConfig,
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, slangUserConfigType);
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: ConfigurationVariableResolver,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  // Add the slang debugInfo and debugSymbols selectors so the cached
  // solcInput, build-info, and build-ID hash all include them.
  const profiles = await augmentSlangOutputSelectionInProfiles(
    resolvedConfig.solidity.profiles,
  );

  return {
    ...resolvedConfig,
    solidity: {
      ...resolvedConfig.solidity,
      profiles,
      registeredCompilerTypes:
        resolvedConfig.solidity.registeredCompilerTypes.includes(
          SLANG_COMPILER_TYPE,
        )
          ? resolvedConfig.solidity.registeredCompilerTypes
          : [
              ...resolvedConfig.solidity.registeredCompilerTypes,
              SLANG_COMPILER_TYPE,
            ],
    },
    slang: resolveSlangConfig(userConfig.slang),
  };
}

/**
 * For each compiler entry whose `type === "slang"`, augments
 * `settings.outputSelection` with the slang debugInfo and debugSymbols
 * selectors.
 * Non-slang entries pass through unchanged.
 */
async function augmentSlangOutputSelectionInProfiles(
  profiles: HardhatConfig["solidity"]["profiles"],
): Promise<HardhatConfig["solidity"]["profiles"]> {
  const result: Record<string, (typeof profiles)[string]> = {};
  for (const [profileName, profile] of Object.entries(profiles)) {
    const augmentedCompilers = await Promise.all(
      profile.compilers.map((compiler) => augmentIfSlang(compiler)),
    );
    const augmentedOverrides: Record<
      string,
      (typeof profile.overrides)[string]
    > = {};
    for (const [overrideKey, override] of Object.entries(profile.overrides)) {
      augmentedOverrides[overrideKey] = await augmentIfSlang(override);
    }
    result[profileName] = {
      ...profile,
      compilers: augmentedCompilers,
      overrides: augmentedOverrides,
    };
  }
  return result;
}

// SolidityCompilerConfig.settings is typed `any` upstream (see hardhat's
// `CommonSolidityCompilerConfig`), so we use the same here — narrowing
// would require type assertions that the repo's eslint config forbids.
async function augmentIfSlang<
  T extends { type?: string; settings?: Record<string, unknown> },
>(entry: T): Promise<T> {
  if (entry.type !== SLANG_COMPILER_TYPE) {
    return entry;
  }
  const settings = isObject(entry.settings) ? entry.settings : {};
  const optimizer: Record<string, unknown> = isObject(settings.optimizer)
    ? settings.optimizer
    : {};
  return {
    ...entry,
    settings: {
      ...settings,
      // Defaults added here instead of in SlangCompiler.compile so this reaches
      // the solcInput and hence the build-id hash.
      optimizer: {
        ...optimizer,
        mode: optimizer.mode ?? DEFAULT_SLANG_OPTIMIZER_MODE,
      },
      outputSelection: await addSlangStackTraceSelectors(
        entry.settings?.outputSelection,
      ),
    },
  };
}

export async function validateResolvedConfig(
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfigValidationError[]> {
  const errors: HardhatConfigValidationError[] = [];

  // Check that the user defined a "slang" build profile
  if (resolvedConfig.solidity.profiles.slang === undefined) {
    errors.push({
      path: ["solidity"],
      message:
        'The hardhat-slang plugin has been installed, but no "slang" build profile was found in the Solidity configuration. Please read the plugin documentation for information on how to create a "slang" build profile.',
    });
  }

  // Check that type: "slang" is not used in non-slang profiles
  if (resolvedConfig.slang.dangerouslyAllowSlangInProduction) {
    log(
      "Skipping non-slang profile validation: dangerouslyAllowSlangInProduction is true",
    );
    return errors;
  }

  for (const [profileName, profile] of Object.entries(
    resolvedConfig.solidity.profiles,
  )) {
    if (profileName === "slang") {
      continue;
    }

    const slangInOtherProfileMessage = `Compiler type "slang" is only supported in the "slang" build profile. Remove type: "slang" from the "${profileName}" profile compilers, or set dangerouslyAllowSlangInProduction in the "slang" plugin config.`;

    for (const [i, compiler] of profile.compilers.entries()) {
      if (compiler.type === SLANG_COMPILER_TYPE) {
        errors.push({
          path: ["solidity", "profiles", profileName, "compilers", i, "type"],
          message: slangInOtherProfileMessage,
        });
      }
    }

    for (const [key, override] of Object.entries(profile.overrides)) {
      if (override.type === SLANG_COMPILER_TYPE) {
        errors.push({
          path: ["solidity", "profiles", profileName, "overrides", key, "type"],
          message: slangInOtherProfileMessage,
        });
      }
    }
  }

  return errors;
}

function resolveSlangConfig(userConfig?: SlangUserConfig): SlangConfig {
  return {
    version: userConfig?.version,
    dangerouslyAllowSlangInProduction:
      userConfig?.dangerouslyAllowSlangInProduction ?? false,
  };
}
