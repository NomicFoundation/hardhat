import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { DirectUserInterruptionManager } from "../../internal/ui/direct-user-interruption-manager.js";
import { UserInteractions } from "../../internal/ui/user-interactions.js";
import { FileManagerImpl } from "../loaders/file-manager.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";

export async function setupRawInterruptionsAndKeystoreLoader(
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
