import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function constants(prefix: string[]): UtilsTaskDefinition[] {
  const constantsTask = emptyTask(
    [...prefix, "constants"],
    "Commonly used Ethereum constants",
  ).build();

  const maxValueTask = buildUtilsTask(
    task(
      [...prefix, "constants", "max-value"],
      "Print the maximum value of an integer type",
    ).addPositionalArgument({
      name: "type",
      description: "The integer type, like uint256 or int128",
      defaultValue: "uint256",
    }),
    async () => await import("./max-value.js"),
  );

  const minValueTask = buildUtilsTask(
    task(
      [...prefix, "constants", "min-value"],
      "Print the minimum value of an integer type",
    ).addPositionalArgument({
      name: "type",
      description: "The integer type, like uint256 or int128",
      defaultValue: "uint256",
    }),
    async () => await import("./min-value.js"),
  );

  const zeroAddressTask = buildUtilsTask(
    task([...prefix, "constants", "zero-address"], "Print the zero address"),
    async () => await import("./zero-address.js"),
  );

  const zeroHashTask = buildUtilsTask(
    task([...prefix, "constants", "zero-hash"], "Print the zero hash"),
    async () => await import("./zero-hash.js"),
  );

  return [
    constantsTask,
    maxValueTask,
    minValueTask,
    zeroAddressTask,
    zeroHashTask,
  ];
}
