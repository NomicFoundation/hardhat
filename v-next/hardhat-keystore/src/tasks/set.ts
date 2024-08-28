import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { io } from "../io.js";
import { isAuthorized } from "../password-manager.js";
import {
  addNewSecret,
  getKeystore,
  setupKeystore,
  validateKey,
} from "../utils.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
  force,
}) => {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    await setupKeystore();
  }

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
