import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { FileManagerImpl } from "../loaders/file-manager.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { DirectUserInterruptionManager } from "../ui/direct-user-interruption-manager.js";
import { UserInteractions } from "../ui/user-interactions.js";

export async function setupDirectInterruptionsAndKeystoreLoader(
  hre: HardhatRuntimeEnvironment,
): Promise<{
  keystoreLoader: KeystoreLoader;
  interruptions: UserInteractions;
}> {
  const keystoreFilePath = hre.config.keystore.filePath;
  const fileManager = new FileManagerImpl();

  const interruptions = new UserInteractions(
    new DirectUserInterruptionManager(),
  );
  const keystoreLoader = new KeystoreFileLoader(keystoreFilePath, fileManager);

  return { keystoreLoader, interruptions };
}
