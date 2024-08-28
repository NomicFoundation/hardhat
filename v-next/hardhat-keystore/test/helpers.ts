import type { KeystoreFile } from "../src/types.js";

import path from "node:path";

import {
  ensureDir,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import envPaths from "env-paths";

export async function createKeyStore(
  pairs: Array<[string, string]>,
): Promise<void> {
  const keystore: KeystoreFile = {
    version: "",
    keys: {},
  };

  for (const [key, value] of pairs) {
    keystore.keys[key] = value;
  }

  await writeJsonFile(await getKeystoreFilePath(), keystore);
}

export async function deleteKeystore(): Promise<void> {
  return remove(await getKeystoreFilePath());
}

export async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}

export async function getConfigDir(): Promise<string> {
  const { config } = envPaths("hardhat");
  await ensureDir(config);
  return config;
}
