import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

const taskList: NewTaskActionFunction = async (
  _taskArguments,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre);

  await list(keystoreLoader);
};

export const list = async (
  keystoreLoader: KeystoreLoader,
  consoleLog: (text: string) => void = console.log,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    consoleLog(UserDisplayMessages.displayNoKeystoreSetErrorMessage());
    process.exitCode = 1;
    return;
  }

  const keystore = await keystoreLoader.loadKeystore();

  const keys = await keystore.listUnverifiedKeys();

  if (keys.length === 0) {
    consoleLog(UserDisplayMessages.displayNoKeysInfoMessage());
    return;
  }

  consoleLog(UserDisplayMessages.displayKeyListInfoMessage(keys));
};

export default taskList;
