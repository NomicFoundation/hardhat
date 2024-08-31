import type { KeystoreLoader, UserInteractions } from "../types.js";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { DirectUserInterruptions } from "../ui/direct-user-interruptions.js";
import { UserInteractionsImpl } from "../ui/user-interactions.js";

import { getKeystoreFilePath } from "./get-keystore-file-path.js";

export async function setupRawInterruptionsAndKeystoreLoader(): Promise<{
  keystoreLoader: KeystoreLoader;
  interruptions: UserInteractions;
}> {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new UserInteractionsImpl(new DirectUserInterruptions());
  const keystoreLoader = new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(interruptions),
  );

  return { keystoreLoader, interruptions };
}
