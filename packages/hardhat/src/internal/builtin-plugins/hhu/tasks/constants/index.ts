import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function constants(prefix: string[]): UtilsTaskDefinition[] {
  const constantsTask = emptyTask(
    [...prefix, "constants"],
    "Commonly used Ethereum constants",
  ).build();

  const zeroAddressTask = buildUtilsTask(
    task([...prefix, "constants", "zero-address"], "Print the zero address"),
    async () => await import("./zero-address.js"),
  );

  return [constantsTask, zeroAddressTask];
}
