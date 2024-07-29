import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";

import { getCacheDir } from "@ignored/hardhat-vnext-core/global-dir";
import { emptyDir, remove } from "@ignored/hardhat-vnext-utils/fs";

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
