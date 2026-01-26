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
import { validateKey } from "../utils/validate-key.js";

interface TaskRenameArguments {
  dev: boolean;
  force: boolean;
  oldKey: string;
  newKey: string;
}

const taskRename: NewTaskActionFunction<TaskRenameArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre, args.dev);

  await rename(
    args,
    keystoreLoader,
    hre.interruptions.requestSecretInput.bind(hre.interruptions),
  );
};

export const rename = async (
  { dev, force, oldKey, newKey }: TaskRenameArguments,
  keystoreLoader: KeystoreLoader,
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<void> => {
  if (!(await validateKey(oldKey))) {
    consoleLog(UserDisplayMessages.displayInvalidKeyErrorMessage(oldKey));
    process.exitCode = 1;
    return;
  }

  if (!(await validateKey(newKey))) {
    consoleLog(UserDisplayMessages.displayInvalidKeyErrorMessage(newKey));
    process.exitCode = 1;
    return;
  }

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

  if (!(await keystore.hasKey(oldKey, masterKey))) {
    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(oldKey, dev));
    process.exitCode = 1;
    return;
  }

  if (!force && (await keystore.hasKey(newKey, masterKey))) {
    consoleLog(UserDisplayMessages.displayKeyAlreadyExistsWarning(newKey, dev));
    process.exitCode = 1;
    return;
  }

  const value = await keystore.readValue(oldKey, masterKey);

  await keystore.addNewValue(newKey, value, masterKey);

  await keystore.removeKey(oldKey, masterKey);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeyRenamedInfoMessage(oldKey, newKey, dev));
};

export default taskRename;
