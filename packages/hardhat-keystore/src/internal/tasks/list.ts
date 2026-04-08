import type { KeystoreConsoleLog, KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

interface TaskListArguments {
  dev: boolean;
}

const taskList: NewTaskActionFunction<TaskListArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const keystoreLoader = setupKeystoreLoaderFrom(hre, args.dev);

  await list(args, keystoreLoader);
};

export const list = async (
  { dev }: TaskListArguments,
  keystoreLoader: KeystoreLoader,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    consoleLog(UserDisplayMessages.displayNoKeystoreSetErrorMessage(dev));
    process.exitCode = 1;
    return;
  }

  const keystore = await keystoreLoader.loadKeystore();

  const keys = await keystore.listUnverifiedKeys();

  if (keys.length === 0) {
    consoleLog(UserDisplayMessages.displayNoKeysInfoMessage(dev));
    return;
  }

  consoleLog(UserDisplayMessages.displayKeyListInfoMessage(keys, dev));
};

export default taskList;
