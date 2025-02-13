import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { deriveMasterKeyFromKeystore } from "../keystores/encryption.js";
import { askPassword } from "../keystores/password.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

interface TaskDeleteArguments {
  key: string;
  force: boolean;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async (
  setArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre);

  await remove(
    setArgs,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const remove = async (
  { key, force }: TaskDeleteArguments,
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
    if (force) {
      return;
    }

    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  await keystore.removeKey(key, masterKey);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeyRemovedInfoMessage(key));
};

export default taskDelete;
