import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { isAuthorized } from "../ui/password-manager.js";
import { showMsgNoKeystoreSet } from "../ui/show-msg-no-keystore-set.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";

interface TaskDeleteArguments {
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  const { keystoreLoader, interruptions } =
    await setupRawInterruptionsAndKeystoreLoader();

  await remove({ key }, keystoreLoader, interruptions);
};

export const remove = async (
  { key }: TaskDeleteArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<void> => {
  if (key === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
      {
        task: "keystore delete",
        argument: "key",
      },
    );
  }

  const keystore = await keystoreLoader.load();

  if (keystore === undefined) {
    await showMsgNoKeystoreSet(interruptions);

    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  const keys = await keystore.listKeys();

  if (!keys.includes(key)) {
    await interruptions.error(`Key "${key}" not found`);

    return;
  }

  await keystore.removeKey(key);

  await interruptions.info(`Key "${key}" removed`);
};

export default taskDelete;
