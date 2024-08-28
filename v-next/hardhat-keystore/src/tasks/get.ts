import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { io } from "../io.js";
import { isAuthorized } from "../password-manager.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";
import { getKeystore } from "../utils.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({ key }) => {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    showMsgNoKeystoreSet();
    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  if (keystore.keys[key] === undefined) {
    console.log(keystore);
    io.error(`Key "${key}" not found`);
    return;
  }

  io.info(keystore.keys[key]);

  return keystore.keys[key];
};

export default taskGet;
