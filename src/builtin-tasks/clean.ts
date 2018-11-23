import tasks from "../core/importable-tasks-dsl";

tasks.task(
  "clean",
  "Clears the cache and deletes all artifacts",
  async (_, { config }) => {
    const fs = await import("fs-extra");
    await fs.remove(config.paths.cache);
    await fs.remove(config.paths.artifacts);
  }
);
