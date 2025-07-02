import type { KeystoreLoader } from "../types.js";
import type { HardhatConfig } from "hardhat/types/config";

import { FileManagerImpl } from "../loaders/file-manager.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";

/**
 * Factory for setting up the keyloader based on the
 * keystore file path from the hre config.
 */
export function setupKeystoreLoaderFrom({
  config,
}: {
  config: HardhatConfig;
}): KeystoreLoader {
  const keystoreFilePath = config.keystore.filePath;
  const fileManager = new FileManagerImpl();

  return new KeystoreFileLoader(keystoreFilePath, fileManager);
}

export function setupTmpKeystoreLoaderFrom({
  config,
}: {
  config: HardhatConfig;
}): KeystoreLoader {
  const keystoreFilePath = `${config.keystore.filePath}.tmp`;
  const fileManager = new FileManagerImpl();

  return new KeystoreFileLoader(keystoreFilePath, fileManager);
}
