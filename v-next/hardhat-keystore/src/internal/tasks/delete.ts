import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupDirectInterruptionsAndKeystoreLoader } from "../utils/setup-direct-interruptions-and-keystore-loader.js";

interface TaskDeleteArguments {
  key: string;
  force: boolean;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async (
  setArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupDirectInterruptionsAndKeystoreLoader(hre);

  await remove(setArgs, keystoreLoader, interruptions);
};

export const remove = async (
  { key, force }: TaskDeleteArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  if (!(await keystoreLoader.isKeystoreInitialized())) {
    process.exitCode = 1;
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keystore = await keystoreLoader.loadKeystore();

  const keys = await keystore.listKeys();

  if (!keys.includes(key)) {
    if (force) {
      return;
    }

    process.exitCode = 1;
    return interruptions.displayKeyNotFoundErrorMessage(key);
  }

  await keystore.removeKey(key);

  await keystoreLoader.saveToKeystoreFile();

  await interruptions.displayKeyRemovedInfoMessage(key);
};

export default taskDelete;
