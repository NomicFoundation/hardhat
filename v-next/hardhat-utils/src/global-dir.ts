import { ensureDir } from "./fs.js";

export async function getConfigDir(): Promise<string> {
  const { config } = await generatePaths();
  await ensureDir(config);
  return config;
}

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
