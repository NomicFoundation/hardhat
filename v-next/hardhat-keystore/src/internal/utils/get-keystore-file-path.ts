import path from "node:path";

import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";
import envPaths from "env-paths";

/**
 * Get the path for the keystore in the Hardhat global config directory.
 */
export async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}

async function getConfigDir(): Promise<string> {
  const { config } = envPaths("hardhat");
  await ensureDir(config);
  return config;
}
