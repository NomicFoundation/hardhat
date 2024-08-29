import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";

export const list = async (
  loader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  const hasKeystore = await loader.hasKeystore();
  if (hasKeystore === false) {
    return showMsgNoKeystoreSet(interruptions);
  }

  const keystore = await loader.loadOrInit();

  const keys = await keystore.listKeys();

  // No authorization needed, it only shows the keys, not the secret values
  if (keys.length === 0) {
    interruptions.info("The keystore does not contain any keys.");
    return;
  }

  interruptions.info("Keys:");
  for (const key of keys) {
    interruptions.info(key);
  }
};

const taskList: NewTaskActionFunction = async () => {
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(interruptions);

  await list(loader, interruptions);
};

export default taskList;
