import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

const taskList: NewTaskActionFunction = async (
  _taskArguments,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader(hre);

  await list(keystoreLoader, interruptions);
};

export const list = async (
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  if (!(await keystoreLoader.exists())) {
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keystore = await keystoreLoader.load();

  const keys = await keystore.listKeys();

  if (keys.length === 0) {
    return interruptions.displayNoKeysInfoMessage();
  }

  await interruptions.displayKeyListInfoMessage(keys);
};

export default taskList;
