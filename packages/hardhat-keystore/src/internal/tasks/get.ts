import type {
  KeystoreConsoleLog,
  KeystoreLoader,
  KeystoreRequestSecretInput,
} from "../types.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { deriveMasterKeyFromKeystore } from "../keystores/encryption.js";
import { getPasswordHandlers } from "../keystores/password.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

interface TaskGetArguments {
  dev: boolean;
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre, args.dev);

  await get(
    args,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const get = async (
  { dev, key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    consoleLog(UserDisplayMessages.displayNoKeystoreSetErrorMessage(dev));
    process.exitCode = 1;
    return;
  }

  const keystore = await keystoreLoader.loadKeystore();

  const { askPassword } = getPasswordHandlers(
    requestSecretInput,
    consoleLog,
    dev,
    keystoreLoader.getKeystoreDevPasswordFilePath(),
  );

  const password = await askPassword();

  const masterKey = deriveMasterKeyFromKeystore({
    encryptedKeystore: keystore.toJSON(),
    password,
  });

  if (!(await keystore.hasKey(key, masterKey))) {
    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(key, dev));
    process.exitCode = 1;
    return;
  }

  const value = await keystore.readValue(key, masterKey);

  consoleLog(UserDisplayMessages.displayValueInfoMessage(value));
};

export default taskGet;
