import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { DirectUserInterruptionManager } from "../ui/direct-user-interruption-manager.js";
import { UserInteractions } from "../ui/user-interactions.js";

export async function setupRawInterruptionsAndKeystoreLoader(
  hre: HardhatRuntimeEnvironment,
): Promise<{
  keystoreLoader: KeystoreLoader;
  interruptions: UserInteractions;
}> {
  const keystoreFilePath = hre.config.keystore.filePath;
  const interruptions = new UserInteractions(
    new DirectUserInterruptionManager(),
  );
  const keystoreLoader = new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(interruptions),
  );

  return { keystoreLoader, interruptions };
}
