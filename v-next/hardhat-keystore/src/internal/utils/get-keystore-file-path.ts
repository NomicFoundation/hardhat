import path from "node:path";

import { getConfigDir } from "@nomicfoundation/hardhat-utils/global-dir";

/**
 * Get the path for the keystore in the Hardhat global config directory.
 */
export async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}
