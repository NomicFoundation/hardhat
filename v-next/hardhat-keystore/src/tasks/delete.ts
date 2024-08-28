import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { isAuthorized } from "../password-manager.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";
import { getKeystore, removeKey } from "../utils.js";

interface TaskDeleteArguments {
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await removeKey(key);
};

export default taskDelete;
