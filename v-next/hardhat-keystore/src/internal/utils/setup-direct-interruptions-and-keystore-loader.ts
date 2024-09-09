import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { FileManagerImpl } from "../loaders/file-manager.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";

/**
 * Factory for setting up the keyloader for the tasks based on the
 * keystore file path from the hre config.
 */
export async function setupDirectInterruptionsAndKeystoreLoader(
  hre: HardhatRuntimeEnvironment,
): Promise<{
  keystoreLoader: KeystoreLoader;
}> {
  const keystoreFilePath = hre.config.keystore.filePath;
  const fileManager = new FileManagerImpl();

  const keystoreLoader = new KeystoreFileLoader(keystoreFilePath, fileManager);

  return { keystoreLoader };
}
