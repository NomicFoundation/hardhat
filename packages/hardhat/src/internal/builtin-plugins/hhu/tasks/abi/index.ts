import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function abi(prefix: string[]): UtilsTaskDefinition[] {
  const abiTask = emptyTask(
    [...prefix, "abi"],
    "Work with ABI signatures and data",
  ).build();

  const sigTask = buildUtilsTask(
    task(
      [...prefix, "abi", "sig"],
      "Print the 4-byte selector of a function or error signature",
    ).addPositionalArgument({
      name: "signature",
      description: 'The signature, like "transfer(address,uint256)"',
    }),
    async () => await import("./sig.js"),
  );

  const sigEventTask = buildUtilsTask(
    task(
      [...prefix, "abi", "sig-event"],
      "Print the 32-byte topic of an event signature",
    ).addPositionalArgument({
      name: "signature",
      description: 'The signature, like "Transfer(address,address,uint256)"',
    }),
    async () => await import("./sig-event.js"),
  );

  return [abiTask, sigTask, sigEventTask];
}
