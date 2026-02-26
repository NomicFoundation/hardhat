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

import { LATEST_KNOWN_SOLX_VERSION } from "../constants.js";

const solxUserConfigType = z.object({
  solx: z
    .object({
      version: z.string().optional(),
      settings: z.record(z.unknown()).optional(),
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

  return {
    ...resolvedConfig,
    solx: resolveSolxConfig(userConfig.solx),
  };
}

function resolveSolxConfig(userConfig?: SolxUserConfig): SolxConfig {
  return {
    version: userConfig?.version ?? LATEST_KNOWN_SOLX_VERSION,
    settings: userConfig?.settings ?? {},
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

/**
 * Clone a profile config, keeping only version (+ type: "solx") for each
 * compiler entry. Strips settings, path, preferWasm, etc.
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
