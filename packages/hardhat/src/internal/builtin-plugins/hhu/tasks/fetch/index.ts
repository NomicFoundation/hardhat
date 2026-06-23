import type { UtilsTaskDefinition } from "../../types.js";
import type { GenerateTasksOptions } from "../index.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function fetch({
  withUtils,
}: GenerateTasksOptions): UtilsTaskDefinition[] {
  const prefix = withUtils ? ["utils"] : [];

  const fetchTask = emptyTask(
    [...prefix, "fetch"],
    "Fetch on-chain data",
  ).build();

  const blockNumberTask = buildUtilsTask(
    task([...prefix, "fetch", "block-number"], "Print the latest block number"),
    async () => await import("./block-number.js"),
  );

  return [fetchTask, blockNumberTask];
}
