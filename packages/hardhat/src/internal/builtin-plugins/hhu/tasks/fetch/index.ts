import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function fetch(prefix: string[]): UtilsTaskDefinition[] {
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
