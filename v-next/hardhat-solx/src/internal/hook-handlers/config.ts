import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  SolidityUserConfig,
  SolxConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatConfigValidationError,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  conditionalUnionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import debug from "debug";
import { z } from "zod";

import {
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SOLX_COMPILER_TYPE,
  SUPPORTED_SOLX_EVM_VERSIONS,
} from "../constants.js";

const log = debug("hardhat:solx:hook-handlers:config");

// These zod types need to be aligned in shape with the ones of the solidity
// builtin plugin, but don't need to revalidate everything.

const SUPPORTED_VERSIONS = Array.from(
  Object.keys(SOLIDITY_TO_SOLX_VERSION_MAP),
);

const supportedVersionsType = z
  .string()
  .refine((val) => SUPPORTED_VERSIONS.includes(val), {
    message: `Solx only supports versions: ${SUPPORTED_VERSIONS.join(", ")}`,
  });

const supportedEvmVersionsType = z
  .string()
  .refine((val) => SUPPORTED_SOLX_EVM_VERSIONS.includes(val), {
    message: `Solx only supports EVM versions: ${SUPPORTED_SOLX_EVM_VERSIONS.join(", ")}`,
  });

const solxSolidityCompilerUserConfigType = z.object({
  version: supportedVersionsType,
  settings: z
    .object({
      evmVersion: supportedEvmVersionsType.optional(),
    })
    .passthrough()
    .optional(),
});

const solidityCompilerUserConfigType = conditionalUnionType(
  [
    [
      (data) => isObject(data) && "type" in data && data.type === "solx",
      solxSolidityCompilerUserConfigType,
    ],
    [(_data) => true, z.any()],
  ],
  "Expected a valid compiler configuration",
);

const singleVersionSolidityUserConfigType = conditionalUnionType(
  [
    [
      (data) => isObject(data) && "type" in data && data.type === "solx",
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
      (data) => isObject(data) && "type" in data && data.type === "solx",
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
  solx: z
    .object({
      dangerouslyAllowSolxInProduction: z.boolean().optional(),
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
  const errors = validateUserConfigZodType(userConfig, solxUserConfigType);

  if (userConfig.solidity !== undefined) {
    errors.push(...validatePluginIsUseful(userConfig.solidity));
  }

  return errors;
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

  const testProfile = resolveTestProfile(resolvedConfig);

  return {
    ...resolvedConfig,
    solidity: {
      ...resolvedConfig.solidity,
      registeredCompilerTypes: [
        ...resolvedConfig.solidity.registeredCompilerTypes,
        SOLX_COMPILER_TYPE,
      ],
      profiles: {
        ...resolvedConfig.solidity.profiles,
        ...(testProfile !== undefined ? { test: testProfile } : {}),
      },
    },
    solx: resolveSolxConfig(userConfig.solx),
  };
}

export async function validateResolvedConfig(
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfigValidationError[]> {
  if (resolvedConfig.solx.dangerouslyAllowSolxInProduction) {
    log(
      "Skipping production profile validation: dangerouslyAllowSolxInProduction is true",
    );
    return [];
  }

  const production = resolvedConfig.solidity.profiles.production;
  if (production === undefined) {
    return [];
  }

  const errors: HardhatConfigValidationError[] = [];

  const solxInProductionMessage =
    'Compiler type "solx" is not supported in the production build profile. Remove type: "solx" from production compilers, or set solx.dangerouslyAllowSolxInProduction in the plugin config.';

  for (const [i, compiler] of production.compilers.entries()) {
    if (compiler.type === SOLX_COMPILER_TYPE) {
      errors.push({
        path: ["solidity", "profiles", "production", "compilers", i, "type"],
        message: solxInProductionMessage,
      });
    }
  }

  for (const [key, override] of Object.entries(production.overrides)) {
    if (override.type === SOLX_COMPILER_TYPE) {
      errors.push({
        path: ["solidity", "profiles", "production", "overrides", key, "type"],
        message: solxInProductionMessage,
      });
    }
  }

  return errors;
}

function resolveSolxConfig(userConfig?: {
  dangerouslyAllowSolxInProduction?: boolean;
}): SolxConfig {
  return {
    dangerouslyAllowSolxInProduction:
      userConfig?.dangerouslyAllowSolxInProduction ?? false,
  };
}

/**
 * Build a "test" build profile by cloning the resolved "default" profile and
 * setting type: "solx" on compilers whose Solidity version is in the
 * supported version map. Returns undefined if the profile shouldn't be created.
 *
 * Operates on the fully-resolved config (SolidityBuildProfileConfig shape),
 * avoiding the complexity of handling all 5 user config forms.
 */
function resolveTestProfile(
  resolvedConfig: HardhatConfig,
): HardhatConfig["solidity"]["profiles"][string] | undefined {
  const profiles = resolvedConfig.solidity.profiles;

  // If user already has a custom test profile, don't override it
  if (profiles.test !== undefined) {
    log("Skipping test profile creation: user already defined a test profile");
    return undefined;
  }

  const defaultProfile = profiles.default;
  if (defaultProfile === undefined) {
    log("Skipping test profile creation: no default profile found");
    return undefined;
  }

  return {
    isolated: defaultProfile.isolated,
    preferWasm: defaultProfile.preferWasm,
    compilers: defaultProfile.compilers.map((compiler) => ({
      ...compiler,
      // Only set type: "solx" for versions we support
      type:
        compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
          ? SOLX_COMPILER_TYPE
          : compiler.type,
      // Replace settings for solx entries but preserve outputSelection
      // (outputSelection is required by Hardhat; solx defaults are injected in SolxCompiler)
      settings:
        compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
          ? { outputSelection: compiler.settings.outputSelection }
          : compiler.settings,
    })),
    overrides: Object.fromEntries(
      Object.entries(defaultProfile.overrides).map(([key, compiler]) => [
        key,
        {
          ...compiler,
          type:
            compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
              ? SOLX_COMPILER_TYPE
              : compiler.type,
          settings:
            compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
              ? { outputSelection: compiler.settings.outputSelection }
              : compiler.settings,
        },
      ]),
    ),
  };
}

/**
 * Check that at least one compiler version in the config is supported by solx.
 * If the plugin is installed but no versions are compatible, emit an error.
 */
function validatePluginIsUseful(
  solidity: SolidityUserConfig,
): HardhatUserConfigValidationError[] {
  const allVersions = getAllCompilerVersions(solidity);

  // If no solidity config at all, skip this check
  if (allVersions.length === 0) {
    return [];
  }

  const hasSupported = allVersions.some(
    (v) => v in SOLIDITY_TO_SOLX_VERSION_MAP,
  );

  if (!hasSupported) {
    const supportedVersions = Object.keys(SOLIDITY_TO_SOLX_VERSION_MAP);
    return [
      {
        path: ["solidity"],
        message: `The hardhat-solx plugin is installed but none of the configured Solidity versions are supported by solx. Supported versions: ${supportedVersions.join(", ")}. Either add a supported version or remove the plugin.`,
      },
    ];
  }

  return [];
}

/**
 * Extract all Solidity compiler versions from the user config, regardless
 * of shape (string, array, single, multi, profiles).
 */
function getAllCompilerVersions(solidity: SolidityUserConfig): string[] {
  if (typeof solidity === "string") {
    return [solidity];
  }
  if (Array.isArray(solidity)) {
    return solidity;
  }
  if ("profiles" in solidity) {
    const versions: string[] = [];
    for (const profile of Object.values(solidity.profiles)) {
      if ("version" in profile) {
        versions.push(profile.version);
      } else if ("compilers" in profile) {
        for (const compiler of profile.compilers) {
          versions.push(compiler.version);
        }
        if (profile.overrides !== undefined) {
          for (const override of Object.values(profile.overrides)) {
            versions.push(override.version);
          }
        }
      }
    }
    return versions;
  }
  if ("version" in solidity) {
    return [solidity.version];
  }
  if ("compilers" in solidity) {
    const versions = solidity.compilers.map((c) => c.version);
    if (solidity.overrides !== undefined) {
      for (const override of Object.values(solidity.overrides)) {
        versions.push(override.version);
      }
    }
    return versions;
  }
  return [];
}
