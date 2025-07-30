import type {
  KeystoreConsoleLog,
  KeystoreLoader,
  KeystoreRequestSecretInput,
} from "../types.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { PLUGIN_ID, PLUGIN_ID_DEV } from "../constants.js";
import {
  createMasterKey,
  deriveMasterKeyFromKeystore,
} from "../keystores/encryption.js";
import { getPasswordHandlers } from "../keystores/password.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  dev: boolean;
  force: boolean;
  key: string;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre, args.dev);

  await set(
    args,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const set = async (
  { dev, force, key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<void> => {
  if (!(await validateKey(key))) {
    consoleLog(UserDisplayMessages.displayInvalidKeyErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  const isKeystoreInitialized = await keystoreLoader.isKeystoreInitialized();

  const { askPassword, setUpPassword } = getPasswordHandlers(
    requestSecretInput,
    consoleLog,
    dev,
    keystoreLoader.getKeystoreDevPasswordFilePath(),
  );

  const password = isKeystoreInitialized
    ? await askPassword()
    : await setUpPassword();

  if (isKeystoreInitialized === false) {
    await keystoreLoader.createUnsavedKeystore(createMasterKey({ password }));
  }

  const keystore = await keystoreLoader.loadKeystore();

  const masterKey = deriveMasterKeyFromKeystore({
    encryptedKeystore: keystore.toJSON(),
    password,
  });

  if (!force && (await keystore.hasKey(key, masterKey))) {
    consoleLog(UserDisplayMessages.displayKeyAlreadyExistsWarning(key));
    process.exitCode = 1;
    return;
  }

  const secret = await requestSecretInput(
    dev ? PLUGIN_ID_DEV : PLUGIN_ID,
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
