import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { PLUGIN_ID } from "../constants.js";
import {
  createMasterKey,
  deriveMasterKeyFromKeystore,
} from "../keystores/encryption.js";
import { askPassword, setUpPassword } from "../keystores/password.js";
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

  await set(
    setArgs,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const set = async (
  { key, force }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
  consoleLog: (text: string) => void = console.log,
): Promise<void> => {
  if (!(await validateKey(key))) {
    consoleLog(UserDisplayMessages.displayInvalidKeyErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  const isKeystoreInitialized = await keystoreLoader.isKeystoreInitialized();

  const password = isKeystoreInitialized
    ? await askPassword(requestSecretInput)
    : await setUpPassword(requestSecretInput, consoleLog);

  if (isKeystoreInitialized === false) {
    await keystoreLoader.createUnsavedKeystore(createMasterKey({ password }));
  }

  const keystore = await keystoreLoader.loadKeystore();

  const masterKey = deriveMasterKeyFromKeystore({
    encryptedKeystore: keystore.toJSON(),
    password,
  });

  // TODO: move app before asking for password?
  if (!force && (await keystore.hasKey(key))) {
    consoleLog(UserDisplayMessages.displayKeyAlreadyExistsWarning(key));
    process.exitCode = 1;
    return;
  }

  const secret = await requestSecretInput(
    PLUGIN_ID,
    UserDisplayMessages.enterSecretMessage(),
  );

  if (secret.length === 0) {
    consoleLog(UserDisplayMessages.displaySecretCannotBeEmptyErrorMessage());
    process.exitCode = 1;
    return;
  }

  await keystore.addNewValue(key, secret, masterKey);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeySetInfoMessage(key));
};

export default taskSet;
