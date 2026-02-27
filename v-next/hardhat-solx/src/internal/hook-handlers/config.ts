import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  MultiVersionSolcUserConfig,
  SingleVersionSolcUserConfig,
  SolidityUserConfig,
  SolxConfig,
  SolxUserConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import {
  DEFAULT_SOLX_SETTINGS,
  LATEST_KNOWN_SOLX_VERSION,
  SUPPORTED_SOLX_EVM_VERSIONS,
} from "../constants.js";

const solxUserConfigType = z.object({
  solx: z
    .object({
      version: z.string().optional(),
      settings: z.record(z.unknown()).optional(),
      dangerouslyAllowSolxInProduction: z.boolean().optional(),
    })
    .optional(),
});

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig,
  validateUserConfig,
  resolveUserConfig,
});

export async function extendUserConfig(
  config: HardhatUserConfig,
  next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
): Promise<HardhatUserConfig> {
  const extendedConfig = await next(config);

  const solidity = extendedConfig.solidity;
  if (solidity === undefined) {
    return extendedConfig;
  }

  // If user already has a custom test profile, don't override it
  if (hasCustomTestProfile(solidity)) {
    return extendedConfig;
  }

  return addTestProfile(extendedConfig, solidity);
}

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  const errors = validateUserConfigZodType(userConfig, solxUserConfigType);

  if (userConfig.solidity !== undefined) {
    errors.push(...validateEvmVersions(userConfig.solidity));
    errors.push(...validateProductionProfile(userConfig));
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

  return {
    ...resolvedConfig,
    solx: resolveSolxConfig(userConfig.solx),
  };
}

function resolveSolxConfig(userConfig?: SolxUserConfig): SolxConfig {
  return {
    version: userConfig?.version ?? LATEST_KNOWN_SOLX_VERSION,
    settings: userConfig?.settings ?? DEFAULT_SOLX_SETTINGS,
  };
}

function hasCustomTestProfile(solidity: SolidityUserConfig): boolean {
  return (
    typeof solidity === "object" &&
    !Array.isArray(solidity) &&
    "profiles" in solidity &&
    "test" in solidity.profiles
  );
}

function addTestProfile(
  config: HardhatUserConfig,
  solidity: SolidityUserConfig,
): HardhatUserConfig {
  // String: "0.8.28"
  if (typeof solidity === "string") {
    return {
      ...config,
      solidity: {
        profiles: {
          default: { version: solidity },
          test: { version: solidity, type: "solx" },
        },
      },
    };
  }

  // Array: ["0.8.24", "0.8.25"]
  if (Array.isArray(solidity)) {
    return {
      ...config,
      solidity: {
        profiles: {
          default: {
            compilers: solidity.map((v) => ({ version: v })),
          },
          test: {
            compilers: solidity.map((v) => ({ version: v, type: "solx" })),
          },
        },
      },
    };
  }

  // Build profiles: { profiles: { default: {...} } }
  if ("profiles" in solidity) {
    const defaultProfile = solidity.profiles.default;
    return {
      ...config,
      solidity: {
        ...solidity,
        profiles: {
          ...solidity.profiles,
          test: cloneWithSolxType(defaultProfile),
        },
      },
    };
  }

  // Single/multi version object: { version: ... } or { compilers: [...] }
  // Extract npmFilesToBuild (from CommonSolidityUserConfig) separately
  const {
    npmFilesToBuild,
    ...defaultProfileContent
  }: { npmFilesToBuild?: string[] } & (
    | SingleVersionSolcUserConfig
    | MultiVersionSolcUserConfig
  ) = solidity;

  return {
    ...config,
    solidity: {
      profiles: {
        default: defaultProfileContent,
        test: cloneWithSolxType(defaultProfileContent),
      },
      ...(npmFilesToBuild !== undefined ? { npmFilesToBuild } : {}),
    },
  };
}

function validateEvmVersions(
  solidity: SolidityUserConfig,
): HardhatUserConfigValidationError[] {
  const errors: HardhatUserConfigValidationError[] = [];

  for (const { path, entry } of iterateCompilerEntries(solidity)) {
    if (entry.type !== "solx") {
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

function validateProductionProfile(
  userConfig: HardhatUserConfig,
): HardhatUserConfigValidationError[] {
  if (userConfig.solx?.dangerouslyAllowSolxInProduction === true) {
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
    return [];
  }

  const errors: HardhatUserConfigValidationError[] = [];
  const production = solidity.profiles.production;

  if ("version" in production && production.type === "solx") {
    errors.push({
      path: ["solidity", "profiles", "production", "type"],
      message:
        'Compiler type "solx" is not supported in the production build profile. Remove type: "solx" from production compilers, or set solx.dangerouslyAllowSolxInProduction in the plugin config.',
    });
  } else if ("compilers" in production) {
    for (const [i, compiler] of production.compilers.entries()) {
      if (compiler.type === "solx") {
        errors.push({
          path: ["solidity", "profiles", "production", "compilers", i, "type"],
          message:
            'Compiler type "solx" is not supported in the production build profile. Remove type: "solx" from production compilers, or set solx.dangerouslyAllowSolxInProduction in the plugin config.',
        });
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
 * Clone a profile, setting compiler type to "solx" and keeping only the
 * version. Strips settings, path, preferWasm, etc.
 * This mirrors core's `copyFromDefault` behavior.
 */
function cloneWithSolxType(
  profile: SingleVersionSolcUserConfig | MultiVersionSolcUserConfig,
): SingleVersionSolcUserConfig | MultiVersionSolcUserConfig {
  // Single version: { version: "0.8.28", ... }
  if ("version" in profile) {
    return { version: profile.version, type: "solx" };
  }

  // Multi version: { compilers: [...], overrides: {...} }
  return {
    compilers: profile.compilers.map((c) => ({
      version: c.version,
      type: "solx" as const,
    })),
    ...(profile.overrides !== undefined
      ? {
          overrides: Object.fromEntries(
            Object.entries(profile.overrides).map(([key, val]) => [
              key,
              { version: val.version, type: "solx" as const },
            ]),
          ),
        }
      : {}),
  };
}
