import type { Keystore, KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async (
  setArgs,
): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await set(setArgs, keystoreLoader, interruptions);
};

export const set = async (
  { key, force }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  checkMissingKeyTaskArgument(key, "keystore set");

  if (!(await validateKey(key))) {
    return interruptions.displayInvalidKeyErrorMessage(key);
  }

  let keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    keystore = await keystoreLoader.create();
  }

  if (!force && (await _hasKey(keystore, key))) {
    return interruptions.displayKeyAlreadyExistsWarning(key);
  }

  const secret = await interruptions.requestSecretFromUser();

  if (secret.length === 0) {
    return interruptions.displaySecretCannotBeEmptyErrorMessage();
  }

  await keystore.addNewValue(key, secret);

  await interruptions.displayKeySetInfoMessage(key);
};

async function _hasKey(keystore: Keystore, key: string) {
  const existingValue = await keystore.readValue(key);

  return existingValue !== undefined;
}

export default taskSet;
