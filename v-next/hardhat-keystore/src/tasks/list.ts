import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

const taskList: NewTaskActionFunction = async (): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await list(keystoreLoader, interruptions);
};

export const list = async (
  keystoreLoader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  const keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keys = await keystore.listKeys();

  if (keys.length === 0) {
    return interruptions.displayNoKeysInfoMessage();
  }

  await interruptions.displayKeyListInfoMessage(keys);
};

export default taskList;
