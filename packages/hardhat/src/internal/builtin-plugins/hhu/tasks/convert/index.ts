import type { UtilsTaskDefinition } from "../../types.js";

import { ArgumentType } from "../../../../../types/arguments.js";
import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function convert(prefix: string[]): UtilsTaskDefinition[] {
  const convertTask = emptyTask(
    [...prefix, "convert"],
    "Convert values between common Ethereum representations",
  ).build();

  const padTask = buildUtilsTask(
    task(
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
      }),
    async () => await import("./pad.js"),
  );

  return [convertTask, padTask];
}
