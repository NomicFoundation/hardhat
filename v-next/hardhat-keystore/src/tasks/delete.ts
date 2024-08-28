import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import {
  removeKey,
  UnencryptedKeystoreLoader,
} from "../keystores/unencrypted-keystore-loader.js";
import { isAuthorized } from "../password-manager.js";
import { showMsgNoKeystoreSet } from "../utils/show-msg-no-keystore-set.js";

interface TaskDeleteArguments {
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  const loader = new UnencryptedKeystoreLoader();

  const hasKeystore = await loader.hasKeystore();
  if (!hasKeystore) {
    return showMsgNoKeystoreSet();
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await removeKey(key);
};

export default taskDelete;
