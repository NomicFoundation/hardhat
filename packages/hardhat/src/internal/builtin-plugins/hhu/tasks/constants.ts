import type { GenerateTasksOptions } from "./index.js";
import type { TaskDefinition } from "../../../../types/index.js";

import { emptyTask, task } from "../../../core/config.js";

const zeroAddress = "0x0000000000000000000000000000000000000000";

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
    .setAction(async () => ({
      default: () => console.log(zeroAddress),
    }))
    .build();

  return [constantsTask, zeroAddressTask];
}
