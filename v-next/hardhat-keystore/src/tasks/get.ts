import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { isAuthorized } from "../ui/password-manager.js";
import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({ key }) => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  return get({ key }, keystoreLoader, interruptions);
};

export const get = async (
  { key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<string | undefined> => {
  checkMissingKeyTaskArgument(key, "keystore get");

  const keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    await interruptions.displayNoKeystoreSetErrorMessage();

    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  const value = await keystore.readValue(key);

  if (value === undefined) {
    await interruptions.displayKeyNotFoundErrorMessage(key);

    return;
  }

  await interruptions.displayValueInfoMessage(value);

  return value;
};

export default taskGet;
