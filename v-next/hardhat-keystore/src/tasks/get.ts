import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
}): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await get({ key }, keystoreLoader, interruptions);
};

export const get = async (
  { key }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  checkMissingKeyTaskArgument(key, "keystore get");

  if (!(await keystoreLoader.exists())) {
    return interruptions.displayNoKeystoreSetErrorMessage();
  }

  const keystore = await keystoreLoader.load();

  const value = await keystore.readValue(key);

  if (value === undefined) {
    return interruptions.displayKeyNotFoundErrorMessage(key);
  }

  await interruptions.displayValueInfoMessage(value);
};

export default taskGet;
