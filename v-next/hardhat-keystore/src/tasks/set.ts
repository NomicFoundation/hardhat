import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import chalk from "chalk";

import { isAuthorized } from "../ui/password-manager.js";
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

  const keystore = await keystoreLoader.create();

  if (!(await validateKey(key))) {
    const errMsg = `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`;
    await interruptions.error(errMsg);

    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  if (!force) {
    const existingValue = await keystore.readValue(key);

    if (existingValue !== undefined) {
      await interruptions.warn(
        `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
      );

      return;
    }
  }

  const value = await interruptions.requestSecretInput(
    "Enter value to store: ",
  );

  if (value.length === 0) {
    await interruptions.error("The value cannot be empty.");

    return;
  }

  await keystore.addNewValue(key, value);

  await interruptions.info(`Key "${key}" set`);
};

export default taskSet;
