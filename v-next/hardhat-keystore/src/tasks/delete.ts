import type { KeystoreLoader, UserInteractions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

interface TaskDeleteArguments {
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await remove({ key }, keystoreLoader, interruptions);
};

export const remove = async (
  { key }: TaskDeleteArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  checkMissingKeyTaskArgument(key, "keystore delete");

  if (!(await keystoreLoader.exists())) {
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keystore = await keystoreLoader.load();

  const keys = await keystore.listKeys();

  if (!keys.includes(key)) {
    return interruptions.displayKeyNotFoundErrorMessage(key);
  }

  await keystore.removeKey(key);

  await keystoreLoader.save(keystore);

  await interruptions.displayKeyRemovedInfoMessage(key);
};

export default taskDelete;
