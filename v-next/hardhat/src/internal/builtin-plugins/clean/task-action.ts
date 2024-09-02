import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { emptyDir, remove } from "@ignored/hardhat-vnext-utils/fs";

import { getCacheDir } from "../../global-dir.js";

interface CleanActionArguments {
  global: boolean;
}

const cleanAction: NewTaskActionFunction<CleanActionArguments> = async (
  { global },
  { config },
) => {
  if (global) {
    const globalCacheDir = await getCacheDir();
    await emptyDir(globalCacheDir);
  }

  await emptyDir(config.paths.cache);
  await remove(config.paths.artifacts);
};

export default cleanAction;
