import type { KeystoreLoader, RawInterruptions } from "../types.js";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";

import { getKeystoreFilePath } from "./get-keystore-file-path.js";

export async function setupRawInterruptionsAndKeystoreLoader(): Promise<{
  keystoreLoader: KeystoreLoader;
  interruptions: RawInterruptions;
}> {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new RawInterruptionsImpl();
  const keystoreLoader = new UnencryptedKeystoreLoader(
    keystoreFilePath,
    interruptions,
  );

  return { keystoreLoader, interruptions };
}
