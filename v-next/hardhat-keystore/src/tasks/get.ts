import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../ui/password-manager.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { showMsgNoKeystoreSet } from "../ui/show-msg-no-keystore-set.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

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

  const keystore = await loader.load();

  if (keystore === undefined) {
    await showMsgNoKeystoreSet(interruptions);

    return;
  }

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
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(keystoreFilePath, interruptions);

  return get({ key }, loader, interruptions);
};

export default taskGet;
