import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";
import envPaths from "env-paths";

export async function getConfigDir(): Promise<string> {
  const { config } = envPaths("hardhat");
  await ensureDir(config);
  return config;
}
