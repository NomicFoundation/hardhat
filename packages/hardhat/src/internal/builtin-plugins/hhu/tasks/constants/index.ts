import type { TaskDefinition } from "../../../../../types/index.js";
import type { GenerateTasksOptions } from "../index.js";

import { emptyTask, task } from "../../../../core/config.js";

export function constants({
  withUtils,
}: GenerateTasksOptions): TaskDefinition[] {
  const prefix = withUtils ? ["utils"] : [];

  const constantsTask = emptyTask(
    [...prefix, "constants"],
    "Commonly used Ethereum constants",
  ).build();

  const zeroAddressTask = task(
    [...prefix, "constants", "zeroAddress"],
    "Print the zero address",
  )
    .setAction(async () => await import("./zero-address.js"))
    .build();

  return [constantsTask, zeroAddressTask];
}
