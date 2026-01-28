import type { HardhatConfig, HardhatUserConfig } from "hardhat/types/config";
import type { HardhatUserConfigValidationError } from "hardhat/types/hooks";

import path from "node:path";

/**
 * Default directory name for generated exposed contract wrappers.
 * This path is relative to the project root.
 */
const DEFAULT_EXPOSED_CONTRACTS_PATH = "exposed-contracts";

/**
 * Validates the plugin-specific configuration options in the user's Hardhat config.
 *
 * Checks that `paths.exposedContracts`, if provided, is a string.
 *
 * @param userConfig - The user's Hardhat configuration object.
 * @returns An array of validation errors. Empty if config is valid.
 */
export async function validatePluginConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  if (
    userConfig.paths !== undefined &&
    userConfig.paths.exposedContracts !== undefined &&
    typeof userConfig.paths.exposedContracts !== "string"
  ) {
    return [
      {
        path: ["paths", "exposedContracts"],
        message: "Expected an optional string.",
      },
    ];
  }

  return [];
}

/**
 * Resolves the plugin configuration by converting user config into fully resolved config.
 *
 * This function:
 * - Resolves `paths.exposedContracts` to an absolute path (defaults to "exposed-contracts")
 *
 * Note: The exposed contracts path is NOT added to `paths.sources.solidity` because
 * the build hook uses a "next-first" pattern: it first builds the original contracts,
 * then generates exposed contracts, then builds them separately.
 *
 * @param userConfig - The user's Hardhat configuration object.
 * @param partiallyResolvedConfig - The config after previous plugins have resolved it.
 * @returns The fully resolved Hardhat configuration with exposed contracts path set.
 */
export async function resolvePluginConfig(
  userConfig: HardhatUserConfig,
  partiallyResolvedConfig: HardhatConfig,
): Promise<HardhatConfig> {
  const exposedContractsPath =
    userConfig.paths?.exposedContracts ?? DEFAULT_EXPOSED_CONTRACTS_PATH;

  const resolvedExposedContractsPath = path.isAbsolute(exposedContractsPath)
    ? exposedContractsPath
    : path.resolve(partiallyResolvedConfig.paths.root, exposedContractsPath);

  return {
    ...partiallyResolvedConfig,
    paths: {
      ...partiallyResolvedConfig.paths,
      exposedContracts: resolvedExposedContractsPath,
    },
  };
}
