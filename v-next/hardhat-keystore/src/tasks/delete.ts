import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { RawInterruptionsImpl } from "../ui/io.js";
import { isAuthorized } from "../ui/password-manager.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";

interface TaskDeleteArguments {
  key: string;
}

export const remove = async (
  { key }: TaskDeleteArguments,
  loader: KeystoreLoader,
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

  const hasKeystore = await loader.hasKeystore();

  if (hasKeystore === false) {
    showMsgNoKeystoreSet(interruptions);

    return;
  }

  const keystore = await loader.loadOrInit();

  if ((await isAuthorized()) === false) {
    return;
  }

  const keys = await keystore.listKeys();

  if (!keys.includes(key)) {
    interruptions.error(`Key "${key}" not found`);

    return;
  }

  await keystore.removeKey(key);

  interruptions.info(`Key "${key}" removed`);
};

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(interruptions);

  await remove({ key }, loader, interruptions);
};

export default taskDelete;
