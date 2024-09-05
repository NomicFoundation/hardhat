import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupDirectInterruptionsAndKeystoreLoader } from "../utils/setup-direct-interruptions-and-keystore-loader.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async (
  { key },
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupDirectInterruptionsAndKeystoreLoader(hre);

  await get({ key }, keystoreLoader, interruptions);
};

export const get = async (
  { key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  if (!(await keystoreLoader.exists())) {
    process.exitCode = 1;
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keystore = await keystoreLoader.load();

  const value = await keystore.readValue(key);

  if (value === undefined) {
    process.exitCode = 1;
    return interruptions.displayKeyNotFoundErrorMessage(key);
  }

  await interruptions.displayValueInfoMessage(value);
};

export default taskGet;
