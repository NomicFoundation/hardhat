import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  SlangSolxConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatConfigValidationError,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  conditionalUnionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import {
  DEFAULT_SOLX_OPTIMIZER_MODE,
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SLANG_SOLX_COMPILER_TYPE,
  SUPPORTED_SOLX_EVM_VERSIONS,
} from "../constants.js";
import { addSlangSolxDebugInfoSelectors } from "../slang-solx-compiler.js";

const log = createDebug("hardhat:slang-solx:hook-handlers:config");

// These zod types need to be aligned in shape with the ones of the solidity
// builtin plugin, but don't need to revalidate everything.

const SUPPORTED_VERSIONS = Array.from(
  Object.keys(SOLIDITY_TO_SOLX_VERSION_MAP),
);

const supportedEvmVersionsType = z
  .string()
  .refine((val) => SUPPORTED_SOLX_EVM_VERSIONS.includes(val), {
    message: `Solx only supports EVM versions: ${SUPPORTED_SOLX_EVM_VERSIONS.join(", ")}`,
  });

const solxSolidityCompilerUserConfigType = z
  .object({
    version: z.string(),
    settings: z
      .object({
        evmVersion: supportedEvmVersionsType.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      (typeof data.path === "string" && data.path.length > 0) ||
      SUPPORTED_VERSIONS.includes(data.version),
    {
      message: `Solx only supports versions: ${SUPPORTED_VERSIONS.join(", ")}`,
      path: ["version"],
    },
  );

const solidityCompilerUserConfigType = conditionalUnionType(
  [
    [
      (data) => isObject(data) && "type" in data && data.type === "slang-solx",
      solxSolidityCompilerUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a valid compiler configuration",
);

const singleVersionSolidityUserConfigType = conditionalUnionType(
  [
    [
      (data) => isObject(data) && "type" in data && data.type === "slang-solx",
      solxSolidityCompilerUserConfigType,
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
      (data) => isObject(data) && "type" in data && data.type === "slang-solx",
      solxSolidityCompilerUserConfigType,
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

const solxUserConfigType = z.object({
  solidity: solidityUserConfigType.optional(),
  slangSolx: z
    .object({
      dangerouslyAllowSlangSolxInProduction: z.boolean().optional(),
    })
    .optional(),
});

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
  validateResolvedConfig,
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, solxUserConfigType);
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

  // Add solx debugInfo selectors so the cached solcInput, build-info,
  // and build-ID hash all include them.
  const profiles = await augmentSolxOutputSelectionInProfiles(
    resolvedConfig.solidity.profiles,
  );

  return {
    ...resolvedConfig,
    solidity: {
      ...resolvedConfig.solidity,
      profiles,
      registeredCompilerTypes:
        resolvedConfig.solidity.registeredCompilerTypes.includes(
          SLANG_SOLX_COMPILER_TYPE,
        )
          ? resolvedConfig.solidity.registeredCompilerTypes
          : [
              ...resolvedConfig.solidity.registeredCompilerTypes,
              SLANG_SOLX_COMPILER_TYPE,
            ],
    },
    slangSolx: resolveSolxConfig(userConfig.slangSolx),
  };
}

/**
 * For each compiler entry whose `type === "slang-solx"`, augments
 * `settings.outputSelection` with the solx debugInfo selectors.
 * Non-slang-solx entries pass through unchanged.
 */
async function augmentSolxOutputSelectionInProfiles(
  profiles: HardhatConfig["solidity"]["profiles"],
): Promise<HardhatConfig["solidity"]["profiles"]> {
  const result: Record<string, (typeof profiles)[string]> = {};
  for (const [profileName, profile] of Object.entries(profiles)) {
    const augmentedCompilers = await Promise.all(
      profile.compilers.map((compiler) => augmentIfSolx(compiler)),
    );
    const augmentedOverrides: Record<
      string,
      (typeof profile.overrides)[string]
    > = {};
    for (const [overrideKey, override] of Object.entries(profile.overrides)) {
      augmentedOverrides[overrideKey] = await augmentIfSolx(override);
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
async function augmentIfSolx<
  T extends { type?: string; settings?: Record<string, unknown> },
>(entry: T): Promise<T> {
  if (entry.type !== SLANG_SOLX_COMPILER_TYPE) {
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
      // Defaults added here instead of in SlangSolxCompiler.compile so this reaches
      // the solcInput and hence the build-id hash.
      viaIR: settings.viaIR ?? false,
      optimizer: {
        ...optimizer,
        mode: optimizer.mode ?? DEFAULT_SOLX_OPTIMIZER_MODE,
      },
      outputSelection: await addSlangSolxDebugInfoSelectors(
        entry.settings?.outputSelection,
      ),
    },
  };
}

export async function validateResolvedConfig(
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfigValidationError[]> {
  const errors: HardhatConfigValidationError[] = [];

  // Check that the user defined a "slang-solx" build profile
  if (resolvedConfig.solidity.profiles["slang-solx"] === undefined) {
    errors.push({
      path: ["solidity"],
      message:
        'The hardhat-slang-solx plugin has been installed, but no "slang-solx" build profile was found in the Solidity configuration. Please read the plugin documentation for information on how to create a "slang-solx" build profile.',
    });
  }

  // Check that type: "slang-solx" is not used in non-slang-solx profiles
  if (resolvedConfig.slangSolx.dangerouslyAllowSlangSolxInProduction) {
    log(
      "Skipping non-slang-solx profile validation: dangerouslyAllowSlangSolxInProduction is true",
    );
    return errors;
  }

  for (const [profileName, profile] of Object.entries(
    resolvedConfig.solidity.profiles,
  )) {
    if (profileName === "slang-solx") {
      continue;
    }

    const solxInOtherProfileMessage = `Compiler type "slang-solx" is only supported in the "slang-solx" build profile. Remove type: "slang-solx" from the "${profileName}" profile compilers, or set slangSolx.dangerouslyAllowSlangSolxInProduction in the plugin config.`;

    for (const [i, compiler] of profile.compilers.entries()) {
      if (compiler.type === SLANG_SOLX_COMPILER_TYPE) {
        errors.push({
          path: ["solidity", "profiles", profileName, "compilers", i, "type"],
          message: solxInOtherProfileMessage,
        });
      }
    }

    for (const [key, override] of Object.entries(profile.overrides)) {
      if (override.type === SLANG_SOLX_COMPILER_TYPE) {
        errors.push({
          path: ["solidity", "profiles", profileName, "overrides", key, "type"],
          message: solxInOtherProfileMessage,
        });
      }
    }
  }

  return errors;
}

function resolveSolxConfig(userConfig?: {
  dangerouslyAllowSlangSolxInProduction?: boolean;
}): SlangSolxConfig {
  return {
    dangerouslyAllowSlangSolxInProduction:
      userConfig?.dangerouslyAllowSlangSolxInProduction ?? false,
  };
}
