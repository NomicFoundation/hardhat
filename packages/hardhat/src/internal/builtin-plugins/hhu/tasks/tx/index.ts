import type { NewTaskDefinitionBuilder } from "../../../../../types/tasks.js";
import type { UtilsTaskDefinition } from "../../types.js";

import { ArgumentType } from "../../../../../types/arguments.js";
import { emptyTask, task } from "../../../../core/config.js";
import { JSON_VALUES_HINT } from "../abi/index.js";
import { buildUtilsTask } from "../utils-task.js";

export function tx(prefix: string[]): UtilsTaskDefinition[] {
  const txTask = emptyTask([...prefix, "tx"], "Work with transactions").build();

  const callTask = buildUtilsTask(
    addCallRequestArguments(
      task(
        [...prefix, "tx", "call"],
        'Call a contract without sending a transaction and print what it returns, decoded if the signature includes the return types, like "balanceOf(address)(uint256)"',
      ),
    ),
    async () => await import("./call.js"),
  );

  const estimateTask = buildUtilsTask(
    addCallRequestArguments(
      task(
        [...prefix, "tx", "estimate"],
        "Estimate the gas that a transaction would use",
      ),
    ),
    async () => await import("./estimate.js"),
  );

  return [txTask, callTask, estimateTask];
}

// Both tasks send the same request, so they take the same arguments
function addCallRequestArguments(builder: NewTaskDefinitionBuilder) {
  return builder
    .addPositionalArgument({
      name: "to",
      description: "The recipient's address",
    })
    .addPositionalArgument({
      name: "signature",
      description: 'The function signature, like "balanceOf(address)"',
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
    })
    .addVariadicArgument({
      name: "args",
      description: `The function's arguments, in order. ${JSON_VALUES_HINT}`,
      defaultValue: [],
    })
    .addOption({
      name: "data",
      description: "The 0x-hex calldata, instead of a signature and arguments",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      defaultValue: undefined,
    })
    .addOption({
      name: "from",
      description: "The sender's address",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      defaultValue: undefined,
    })
    .addOption({
      name: "value",
      description: "The amount of wei to send, in decimal or 0x-hex",
      type: ArgumentType.BIGINT,
      defaultValue: 0n,
    })
    .addOption({
      name: "block",
      description:
        "The block whose state to use: a number, a hash, latest, pending, earliest, safe or finalized",
      defaultValue: "latest",
    });
}
