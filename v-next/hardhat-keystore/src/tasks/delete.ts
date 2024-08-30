import type { KeystoreLoader, RawInterruptions } from "../types.js";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../ui/password-manager.js";
import { RawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { showMsgNoKeystoreSet } from "../ui/show-msg-no-keystore-set.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

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

  const keystore = await loader.load();

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

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new RawInterruptionsImpl();
  const loader = new UnencryptedKeystoreLoader(keystoreFilePath, interruptions);

  await remove({ key }, loader, interruptions);
};

export default taskDelete;
