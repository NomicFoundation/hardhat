import { generatePaths, HARDHAT_PACKAGE_NAME } from "./internal/global-dir.js";

import { ensureDir } from "@nomicfoundation/hardhat-utils/fs";

/**
 * Returns the configuration directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns The path to the hardhat configuration directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getConfigDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  const { config } = await generatePaths(packageName);
  await ensureDir(config);
  return config;
}

/**
 * Returns the cache directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns The path to the hardhat cache directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getCacheDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  const { cache } = await generatePaths(packageName);
  await ensureDir(cache);
  return cache;
}

/**
 * Returns the telemetry directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns A promise that resolves to the path of the telemetry directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getTelemetryDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  const { data } = await generatePaths(packageName);
  await ensureDir(data);
  return data;
}
