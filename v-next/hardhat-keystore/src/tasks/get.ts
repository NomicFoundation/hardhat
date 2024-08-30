import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../ui/password-manager.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";

interface TaskGetArguments {
  key: string;
}

export const get = async (
  { key }: TaskGetArguments,
  loader: KeystoreLoader,
  interruptions: RawInterruptions,
): Promise<string | undefined> => {
  if (key === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
      {
        task: "keystore get",
        argument: "key",
      },
    );
  }

  const hasKeystore = await loader.hasKeystore();

  if (hasKeystore === false) {
    await showMsgNoKeystoreSet(interruptions);

    return;
  }

  const keystore = await loader.loadOrInit();

  if ((await isAuthorized()) === false) {
    return;
  }

  const value = await keystore.readValue(key);

  if (value === undefined) {
    await interruptions.error(`Key "${key}" not found`);
    return;
  }

  await interruptions.info(value);

  return value;
};

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({ key }) => {
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(interruptions);

  return get({ key }, loader, interruptions);
};

export default taskGet;
