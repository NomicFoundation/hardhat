import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";

/**
 *  Returns the path to the hardhat configuration directory.
 *
 * @returns The path to the hardhat configuration directory.
 */
export async function getConfigDir(): Promise<string> {
  const { config } = await generatePaths();
  await ensureDir(config);
  return config;
}

/**
 * Returns the path to the telemetry directory for the specified package.
 * If no package name is provided, the default package name "hardhat" is used.
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName - The name of the package to get the telemetry directory for. Defaults to "hardhat".
 *
 * @returns A promise that resolves to the path of the telemetry directory.
 */
export async function getTelemetryDir(packageName?: string): Promise<string> {
  const { data } = await generatePaths(packageName);
  await ensureDir(data);
  return data;
}

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
