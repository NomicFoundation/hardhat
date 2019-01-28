import { task } from "../internal/core/config/config-env";

import { TASK_CLEAN } from "./task-names";

task(
  TASK_CLEAN,
  "Clears the cache and deletes all artifacts",
  async (_, { config }) => {
    const fs = await import("fs-extra");
    await fs.remove(config.paths.cache);
    await fs.remove(config.paths.artifacts);
  }
);
