import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
}): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await get({ key }, keystoreLoader, interruptions);
};

export const get = async (
  { key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  checkMissingKeyTaskArgument(key, "keystore get");

  const keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    await interruptions.displayNoKeystoreSetErrorMessage();

    return;
  }

  const value = await keystore.readValue(key);

  if (value === undefined) {
    return interruptions.displayKeyNotFoundErrorMessage(key);
  }

  await interruptions.displayValueInfoMessage(value);
};

export default taskGet;
