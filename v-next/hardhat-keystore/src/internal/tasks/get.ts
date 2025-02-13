import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { deriveMasterKeyFromKeystore } from "../keystores/encryption.js";
import { askPassword } from "../keystores/password.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async (
  { key },
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre);

  await get(
    { key },
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const get = async (
  { key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
  consoleLog: (text: string) => void = console.log,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    consoleLog(UserDisplayMessages.displayNoKeystoreSetErrorMessage());
    process.exitCode = 1;
    return;
  }

  const keystore = await keystoreLoader.loadKeystore();

  const password = await askPassword(requestSecretInput);

  const masterKey = deriveMasterKeyFromKeystore({
    encryptedKeystore: keystore.toJSON(),
    password,
  });

  if (!(await keystore.hasKey(key, masterKey))) {
    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  const value = await keystore.readValue(key, masterKey);

  consoleLog(UserDisplayMessages.displayValueInfoMessage(value));
};

export default taskGet;
