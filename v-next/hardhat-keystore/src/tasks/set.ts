import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import chalk from "chalk";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../ui/password-manager.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

export const set = async (
  { key, force }: TaskGetArguments,
  loader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  if (key === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
      {
        task: "keystore set",
        argument: "key",
      },
    );
  }

  const keystore = await loader.create();

  if (!(await validateKey(key, interruptions))) {
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

const taskSet: NewTaskActionFunction<TaskGetArguments> = async (
  setArgs,
): Promise<void> => {
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(interruptions);

  await set(setArgs, loader, interruptions);
};

export default taskSet;
