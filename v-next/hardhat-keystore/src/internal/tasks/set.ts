import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import chalk from "chalk";

import { requestSecretInput } from "../ui/request-secret-input.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async (
  setArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre);

  await set(setArgs, keystoreLoader);
};

export const PRINT_UNENCRYPTED_KEYSTORE_FILE_MESSAGE = true;

export const set = async (
  { key, force }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  consoleLog: (text: string) => void = console.log,
  requestSecretFromUser: (
    requestText: string,
  ) => Promise<string> = requestSecretInput,
): Promise<void> => {
  if (!(await validateKey(key))) {
    consoleLog(UserDisplayMessages.displayInvalidKeyErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  const keystore = (await keystoreLoader.isKeystoreInitialized())
    ? await keystoreLoader.loadKeystore()
    : await keystoreLoader.createUnsavedKeystore();

  if (!force && (await keystore.hasKey(key))) {
    consoleLog(UserDisplayMessages.displayKeyAlreadyExistsWarning(key));
    process.exitCode = 1;
    return;
  }

  if (PRINT_UNENCRYPTED_KEYSTORE_FILE_MESSAGE) {
    consoleLog(
      chalk.red.bold(`***WARNING*** 
  
  During the alpha of Hardhat v3 this plugin doesn't encrypt the keystore file.
  
  DO NO STORE SENSITIVE INFORMATION OR PRIVATE KEYS`),
    );
  }

  const secret = await requestSecretFromUser(
    UserDisplayMessages.enterSecretMessage(),
  );

  if (secret.length === 0) {
    consoleLog(UserDisplayMessages.displaySecretCannotBeEmptyErrorMessage());
    process.exitCode = 1;
    return;
  }

  await keystore.addNewValue(key, secret);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeySetInfoMessage(key));
};

export default taskSet;
