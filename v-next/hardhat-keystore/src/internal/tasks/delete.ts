import type { KeystoreLoader } from "../types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UserDisplayMessages } from "../ui/user-display-messages.js";
import { setupDirectInterruptionsAndKeystoreLoader } from "../utils/setup-direct-interruptions-and-keystore-loader.js";

interface TaskDeleteArguments {
  key: string;
  force: boolean;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async (
  setArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const { keystoreLoader } =
    await setupDirectInterruptionsAndKeystoreLoader(hre);

  await remove(setArgs, keystoreLoader);
};

export const remove = async (
  { key, force }: TaskDeleteArguments,
  keystoreLoader: KeystoreLoader,
  consoleLog: (text: string) => void = console.log,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    consoleLog(UserDisplayMessages.displayNoKeystoreSetErrorMessage());
    process.exitCode = 1;
    return;
  }

  const keystore = await keystoreLoader.loadKeystore();

  const keys = await keystore.listKeys();

  if (!keys.includes(key)) {
    if (force) {
      return;
    }

    consoleLog(UserDisplayMessages.displayKeyNotFoundErrorMessage(key));
    process.exitCode = 1;
    return;
  }

  await keystore.removeKey(key);

  await keystoreLoader.saveKeystoreToFile();

  consoleLog(UserDisplayMessages.displayKeyRemovedInfoMessage(key));
};

export default taskDelete;
