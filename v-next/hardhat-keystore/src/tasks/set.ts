import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { io } from "../io.js";
import {
  addNewSecret,
  UnencryptedKeystoreLoader,
  validateKey,
} from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../password-manager.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
  force,
}) => {
  const loader = new UnencryptedKeystoreLoader();

  await loader.loadOrInit();

  if (!validateKey(key)) {
    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await addNewSecret(key, force);

  io.info(`Key "${key}" set`);
};

export default taskSet;
