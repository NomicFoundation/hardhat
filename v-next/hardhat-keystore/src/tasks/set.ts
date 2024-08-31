import type { KeystoreLoader, RawInterruptions } from "../types.js";
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
    await interruptions.displayInvalidKeyErrorMessage(key);

    return;
  }

  let keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    keystore = await keystoreLoader.create();
  }

  if (!force) {
    const existingValue = await keystore.readValue(key);

    if (existingValue !== undefined) {
      await interruptions.displayKeyAlreadyExistsWarning(key);

      return;
    }
  }

  const secret = await interruptions.requestSecretFromUser();

  if (secret.length === 0) {
    await interruptions.displaySecretCannotBeEmptyErrorMessage();

    return;
  }

  await keystore.addNewValue(key, secret);

  await interruptions.displayKeySetInfoMessage(key);
};

export default taskSet;
