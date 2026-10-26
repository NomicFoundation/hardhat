import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function hash(prefix: string[]): UtilsTaskDefinition[] {
  const hashTask = emptyTask([...prefix, "hash"], "Hash values").build();

  const keccakTask = buildUtilsTask(
    task(
      [...prefix, "hash", "keccak"],
      "Print the keccak256 hash of 0x-hex bytes or a UTF-8 string",
    ).addPositionalArgument({
      name: "value",
      description:
        "The value to hash: 0x-hex is hashed as bytes, anything else as UTF-8",
    }),
    async () => await import("./keccak.js"),
  );

  return [hashTask, keccakTask];
}
