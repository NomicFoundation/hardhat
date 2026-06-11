import type { TaskDefinition } from "../../../../../types/tasks.js";
import type { GenerateTasksOptions } from "../index.js";

import { ArgumentType } from "../../../../../types/arguments.js";
import { emptyTask, task } from "../../../../core/config.js";

export function convert({ withUtils }: GenerateTasksOptions): TaskDefinition[] {
  const prefix = withUtils ? ["utils"] : [];

  const convertTask = emptyTask(
    [...prefix, "convert"],
    "Convert values between common Ethereum representations",
  ).build();

  const padTask = task(
    [...prefix, "convert", "pad"],
    "Pad a hex string to a given byte length",
  )
    .addPositionalArgument({
      name: "value",
      description: "The hex string to pad",
    })
    .addOption({
      name: "length",
      description: "The target length, in bytes",
      type: ArgumentType.INT,
      defaultValue: 32,
    })
    .addFlag({
      name: "left",
      description: "Pad to the left (default)",
    })
    .addFlag({
      name: "right",
      description: "Pad to the right",
    })
    .setAction(async () => await import("./pad.js"))
    .build();

  return [convertTask, padTask];
}
