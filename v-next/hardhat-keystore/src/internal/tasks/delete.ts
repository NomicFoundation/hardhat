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

interface TaskDeleteArguments {
  dev: boolean;
  force: boolean;
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre, args.dev);

  await remove(
    args,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const remove = async (
  { dev, force, key }: TaskDeleteArguments,
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
    if (force) {
      return;
    }

    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(key, dev));
    process.exitCode = 1;
    return;
  }

  await keystore.removeKey(key, masterKey);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeyRemovedInfoMessage(key, dev));
};

export default taskDelete;
