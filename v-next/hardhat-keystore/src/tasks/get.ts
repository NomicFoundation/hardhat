import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { io } from "../ui/io.js";
import { isAuthorized } from "../ui/password-manager.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({ key }) => {
  const loader = new UnencryptedKeystoreLoader();

  const hasKeystore = await loader.hasKeystore();
  if (!hasKeystore) {
    return showMsgNoKeystoreSet();
  }

  const keystore = await loader.loadOrInit();

  if ((await isAuthorized()) === false) {
    return;
  }

  const value = await keystore.readValue(key);

  if (value === undefined) {
    io.error(`Key "${key}" not found`);
    return;
  }

  io.info(value);

  return value;
};

export default taskGet;
