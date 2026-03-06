import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  SolidityUserConfig,
  SolxConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import debug from "debug";
import { z } from "zod";

import {
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SOLX_COMPILER_TYPE,
  SUPPORTED_SOLX_EVM_VERSIONS,
} from "../constants.js";

const log = debug("hardhat:solx:hook-handlers:config");

const solxUserConfigType = z.object({
  solx: z
    .object({
      dangerouslyAllowSolxInProduction: z.boolean().optional(),
    })
    .optional(),
});

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  const errors = validateUserConfigZodType(userConfig, solxUserConfigType);

  if (userConfig.solidity !== undefined) {
    errors.push(...validateSolxCompilerFields(userConfig.solidity));
    errors.push(...validateEvmVersions(userConfig.solidity));
    errors.push(...validateSolidityVersions(userConfig.solidity));
    errors.push(...validateProductionProfile(userConfig));
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

  // Register "solx" as a known compiler type
  resolvedConfig.solidity.registeredCompilerTypes.push(SOLX_COMPILER_TYPE);

  // Add "test" build profile if not already present
  addTestProfile(resolvedConfig);

  return {
    ...resolvedConfig,
    solx: resolveSolxConfig(userConfig.solx),
  };
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
 * Add a "test" build profile by cloning the resolved "default" profile and
 * setting type: "solx" on compilers whose Solidity version is in the
 * supported version map.
 *
 * Operates on the fully-resolved config (SolidityBuildProfileConfig shape),
 * avoiding the complexity of handling all 5 user config forms.
 */
function addTestProfile(resolvedConfig: HardhatConfig): void {
  const profiles = resolvedConfig.solidity.profiles;

  // If user already has a custom test profile, don't override it
  if (profiles.test !== undefined) {
    log("Skipping test profile creation: user already defined a test profile");
    return;
  }

  const defaultProfile = profiles.default;
  if (defaultProfile === undefined) {
    log("Skipping test profile creation: no default profile found");
    return;
  }

  profiles.test = {
    isolated: defaultProfile.isolated,
    preferWasm: defaultProfile.preferWasm,
    compilers: defaultProfile.compilers.map((compiler) => ({
      ...compiler,
      // Only set type: "solx" for versions we support
      type:
        compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
          ? SOLX_COMPILER_TYPE
          : compiler.type,
      // Strip settings for solx entries (solx defaults are injected in SolxCompiler)
      settings:
        compiler.version in SOLIDITY_TO_SOLX_VERSION_MAP
          ? {}
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
              ? {}
              : compiler.settings,
        },
      ]),
    ),
  };
}

/**
 * Validate that solx compiler entries don't contain solc-specific fields
 * that passed through the core schema's .passthrough() on non-solc types.
 */
function validateSolxCompilerFields(
  solidity: SolidityUserConfig,
): HardhatUserConfigValidationError[] {
  const errors: HardhatUserConfigValidationError[] = [];

  for (const { path, entry } of iterateCompilerEntries(solidity)) {
    if (entry.type !== SOLX_COMPILER_TYPE) {
      continue;
    }

    // preferWasm is solc-specific and not applicable to solx
    if ("preferWasm" in entry) {
      errors.push({
        path: [...path, "preferWasm"],
        message:
          'The "preferWasm" option is not supported for solx compilers. It only applies to solc.',
      });
    }
  }

  return errors;
}

function validateEvmVersions(
  solidity: SolidityUserConfig,
): HardhatUserConfigValidationError[] {
  const errors: HardhatUserConfigValidationError[] = [];

  for (const { path, entry } of iterateCompilerEntries(solidity)) {
    if (entry.type !== SOLX_COMPILER_TYPE) {
      continue;
    }

    const evmVersion = entry.settings?.evmVersion;
    if (evmVersion === undefined) {
      continue;
    }

    if (!SUPPORTED_SOLX_EVM_VERSIONS.includes(evmVersion)) {
      errors.push({
        path: [...path, "settings", "evmVersion"],
        message: `solx does not support EVM version "${evmVersion}". Supported versions: ${SUPPORTED_SOLX_EVM_VERSIONS.join(", ")}.`,
      });
    }
  }

  return errors;
}

/**
 * Validate that compilers with type: "solx" use a Solidity version that
 * is in the supported version map.
 */
function validateSolidityVersions(
  solidity: SolidityUserConfig,
): HardhatUserConfigValidationError[] {
  const errors: HardhatUserConfigValidationError[] = [];
  const supportedVersions = Object.keys(SOLIDITY_TO_SOLX_VERSION_MAP);

  for (const { path, entry } of iterateCompilerEntries(solidity)) {
    if (entry.type !== SOLX_COMPILER_TYPE) {
      continue;
    }

    if (
      entry.version !== undefined &&
      !(entry.version in SOLIDITY_TO_SOLX_VERSION_MAP)
    ) {
      errors.push({
        path: [...path, "version"],
        message: `Solidity version "${entry.version}" is not supported by solx. Supported versions: ${supportedVersions.join(", ")}.`,
      });
    }
  }

  return errors;
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

function validateProductionProfile(
  userConfig: HardhatUserConfig,
): HardhatUserConfigValidationError[] {
  if (userConfig.solx?.dangerouslyAllowSolxInProduction === true) {
    log(
      "Skipping production profile validation: dangerouslyAllowSolxInProduction is true",
    );
    return [];
  }

  const solidity = userConfig.solidity;
  if (
    solidity === undefined ||
    typeof solidity === "string" ||
    Array.isArray(solidity) ||
    !("profiles" in solidity) ||
    solidity.profiles.production === undefined
  ) {
    log(
      "Skipping production profile validation: no explicit production profile configured",
    );
    return [];
  }

  const errors: HardhatUserConfigValidationError[] = [];
  const production = solidity.profiles.production;

  const solxInProductionMessage =
    'Compiler type "solx" is not supported in the production build profile. Remove type: "solx" from production compilers, or set solx.dangerouslyAllowSolxInProduction in the plugin config.';

  if ("version" in production && production.type === SOLX_COMPILER_TYPE) {
    errors.push({
      path: ["solidity", "profiles", "production", "type"],
      message: solxInProductionMessage,
    });
  } else if ("compilers" in production) {
    for (const [i, compiler] of production.compilers.entries()) {
      if (compiler.type === SOLX_COMPILER_TYPE) {
        errors.push({
          path: ["solidity", "profiles", "production", "compilers", i, "type"],
          message: solxInProductionMessage,
        });
      }
    }
    if (production.overrides !== undefined) {
      for (const [key, override] of Object.entries(production.overrides)) {
        if (override.type === SOLX_COMPILER_TYPE) {
          errors.push({
            path: [
              "solidity",
              "profiles",
              "production",
              "overrides",
              key,
              "type",
            ],
            message: solxInProductionMessage,
          });
        }
      }
    }
  }

  return errors;
}

interface CompilerEntryInfo {
  path: Array<string | number>;
  entry: { type?: string; settings?: any; version?: string };
}

function iterateCompilerEntries(
  solidity: SolidityUserConfig,
): CompilerEntryInfo[] {
  if (typeof solidity === "string" || Array.isArray(solidity)) {
    return [];
  }

  if ("profiles" in solidity) {
    const entries: CompilerEntryInfo[] = [];
    for (const [profileName, profile] of Object.entries(solidity.profiles)) {
      if ("version" in profile) {
        entries.push({
          path: ["solidity", "profiles", profileName],
          entry: profile,
        });
      } else if ("compilers" in profile) {
        for (const [i, compiler] of profile.compilers.entries()) {
          entries.push({
            path: ["solidity", "profiles", profileName, "compilers", i],
            entry: compiler,
          });
        }
        if (profile.overrides !== undefined) {
          for (const [key, compiler] of Object.entries(profile.overrides)) {
            entries.push({
              path: ["solidity", "profiles", profileName, "overrides", key],
              entry: compiler,
            });
          }
        }
      }
    }
    return entries;
  }

  if ("version" in solidity) {
    return [{ path: ["solidity"], entry: solidity }];
  }

  if ("compilers" in solidity) {
    const entries: CompilerEntryInfo[] = [];
    for (const [i, compiler] of solidity.compilers.entries()) {
      entries.push({ path: ["solidity", "compilers", i], entry: compiler });
    }
    if (solidity.overrides !== undefined) {
      for (const [key, compiler] of Object.entries(solidity.overrides)) {
        entries.push({
          path: ["solidity", "overrides", key],
          entry: compiler,
        });
      }
    }
    return entries;
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
