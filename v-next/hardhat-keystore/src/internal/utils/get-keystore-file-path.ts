import path from "node:path";

import { getConfigDir } from "@nomicfoundation/hardhat-utils/global-dir";

/**
 * Get the path for the keystore in the Hardhat global config directory.
 */
export async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}

/**
 * Get the path for the development keystore in the Hardhat global config directory.
 */
export async function getDevKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "dev.keystore.json");
}

/**
 * Get the path for the file containing the unencrypted password for the development keystore in the Hardhat global config directory.
 */
export async function getDevKeystorePasswordFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "dev-password-file.txt");
}
