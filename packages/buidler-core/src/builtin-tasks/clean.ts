import fsExtra from "fs-extra";

import { task } from "../internal/core/config/config-env";

import { TASK_CLEAN } from "./task-names";

export default function () {
  task(
    TASK_CLEAN,
    "Clears the cache and deletes all artifacts",
    async (_, { config }) => {
      await fsExtra.emptyDir(config.paths.cache);
      await fsExtra.remove(config.paths.artifacts);
    }
  );
}
