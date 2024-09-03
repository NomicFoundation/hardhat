import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";

import { HARDHAT_PACKAGE_NAME } from "./constants.js";

/**
 * Returns the path to the hardhat configuration directory.
 *
 * @returns The path to the hardhat configuration directory.
 */
export async function getConfigDir(): Promise<string> {
  const { config } = await generatePaths();
  await ensureDir(config);
  return config;
}

/**
 * Returns the path to the hardhat cache directory.
 *
 * @returns The path to the hardhat cache directory.
 */
export async function getCacheDir(): Promise<string> {
  const { cache } = await generatePaths();
  await ensureDir(cache);
  return cache;
}

/**
 * Returns the path to the telemetry directory for the specified package.
 * If no package name is provided, the default package name "hardhat" is used.
 * Ensures that the directory exists before returning the path.
 *
 * @returns A promise that resolves to the path of the telemetry directory.
 */
export async function getTelemetryDir(): Promise<string> {
  const { data } = await generatePaths();
  await ensureDir(data);
  return data;
}

async function generatePaths() {
  const { default: envPaths } = await import("env-paths");
  return envPaths(HARDHAT_PACKAGE_NAME);
}
