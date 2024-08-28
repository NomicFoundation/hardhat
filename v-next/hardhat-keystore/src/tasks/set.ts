import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { io } from "../ui/io.js";
import { isAuthorized } from "../ui/password-manager.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
  force,
}) => {
  const loader = new UnencryptedKeystoreLoader();

  const keystore = await loader.loadOrInit();

  if (!validateKey(key)) {
    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await keystore.addNewSecret(key, force);

  io.info(`Key "${key}" set`);
};

export default taskSet;
