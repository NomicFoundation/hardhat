import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { showMsgNoKeystoreSet } from "../ui/show-msg-no-keystore-set.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

export const list = async (
  loader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  const keystore = await loader.load();

  if (keystore === undefined) {
    await showMsgNoKeystoreSet(interruptions);

    return;
  }

  const keys = await keystore.listKeys();

  // No authorization needed, it only shows the keys, not the values
  if (keys.length === 0) {
    await interruptions.info("The keystore does not contain any keys.");
    return;
  }

  await interruptions.info("Keys:");
  for (const key of keys) {
    await interruptions.info(key);
  }
};

const taskList: NewTaskActionFunction = async () => {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(keystoreFilePath, interruptions);

  await list(loader, interruptions);
};

export default taskList;
