import { ActionType, TaskArguments } from "../types";
import { ITaskDefinition } from "../core/tasks/TaskDefinition";

declare function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

task(
  "clean",
  "Clears the cache and deletes all artifacts",
  async (_, { config }) => {
    const fs = await import("fs-extra");
    await fs.remove(config.paths.cache);
    await fs.remove(config.paths.artifacts);
  }
);
