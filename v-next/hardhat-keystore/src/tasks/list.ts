import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

const taskList: NewTaskActionFunction = async () => {
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
    await interruptions.displayNoKeystoreSetErrorMessage(interruptions);

    return;
  }

  const keys = await keystore.listKeys();

  // No authorization needed, it only shows the keys, not the values
  if (keys.length === 0) {
    await interruptions.displayNoKeysInfoMessage();

    return;
  }

  await interruptions.displayKeyListInfoMessage(keys);
};

export default taskList;
