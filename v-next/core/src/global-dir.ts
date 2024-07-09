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

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
