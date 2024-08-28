import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
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

  const keystore = await loader.loadOrInit();

  if ((await isAuthorized()) === false) {
    return;
  }

  await keystore.removeKey(key);
};

export default taskDelete;
