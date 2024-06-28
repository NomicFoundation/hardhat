import { findClosestHardhatConfig } from "./internal/helpers/config-loading.js";

// Note: We import the builtin plugins' types here, so that any type extension
// they may have gets loaded.
import "./internal/builtin-plugins/index.js";

export type * from "@ignored/hardhat-vnext-core/config";
export * from "@ignored/hardhat-vnext-core/config";

/**
 * Attempts to find the nearest Hardhat config file, starting from the current
 * working directory. If no config file is found, an error is thrown.
 *
 * @returns The path to the nearest Hardhat config file.
 */
export async function resolveHardhatConfigPath(): Promise<string> {
  const configPath = process.env.HARDHAT_CONFIG;

  if (configPath !== undefined) {
    return configPath;
  }

  return findClosestHardhatConfig();
}
