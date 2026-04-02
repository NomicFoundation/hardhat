import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { emptyDir, remove } from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";

interface CleanActionArguments {
  global: boolean;
}

const cleanAction: NewTaskActionFunction<CleanActionArguments> = async (
  { global },
  { config, hooks },
) => {
  if (global) {
    const globalCacheDir = await getCacheDir();
    await emptyDir(globalCacheDir);
  }

  await emptyDir(config.paths.cache);
  await remove(config.paths.artifacts);

  await hooks.runParallelHandlers("clean", "onClean", []);
};

export default cleanAction;
