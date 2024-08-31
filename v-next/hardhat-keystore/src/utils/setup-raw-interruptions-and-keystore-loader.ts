import type { KeystoreLoader, RawInterruptions } from "../types.js";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { ConsoleWrapperImpl } from "../ui/console-wrapper.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";

import { getKeystoreFilePath } from "./get-keystore-file-path.js";

export async function setupRawInterruptionsAndKeystoreLoader(): Promise<{
  keystoreLoader: KeystoreLoader;
  interruptions: RawInterruptions;
}> {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new RawInterruptionsImpl(new ConsoleWrapperImpl());
  const keystoreLoader = new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(interruptions),
  );

  return { keystoreLoader, interruptions };
}
