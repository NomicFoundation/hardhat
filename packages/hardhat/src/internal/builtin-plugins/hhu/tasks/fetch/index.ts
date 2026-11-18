import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { BLOCK_OPTION } from "../block-option.js";
import { buildUtilsTask } from "../utils-task.js";

export function fetch(prefix: string[]): UtilsTaskDefinition[] {
  const fetchTask = emptyTask(
    [...prefix, "fetch"],
    "Fetch on-chain data",
  ).build();

  const balanceTask = buildUtilsTask(
    task(
      [...prefix, "fetch", "balance"],
      "Print the balance of an address, in wei",
    )
      .addPositionalArgument({
        name: "address",
        description: "The address to check",
      })
      .addOption(BLOCK_OPTION),
    async () => await import("./balance.js"),
  );

  const blockNumberTask = buildUtilsTask(
    task([...prefix, "fetch", "block-number"], "Print the latest block number"),
    async () => await import("./block-number.js"),
  );

  const chainIdTask = buildUtilsTask(
    task([...prefix, "fetch", "chain-id"], "Print the chain ID"),
    async () => await import("./chain-id.js"),
  );

  const gasPriceTask = buildUtilsTask(
    task([...prefix, "fetch", "gas-price"], "Print the gas price, in wei"),
    async () => await import("./gas-price.js"),
  );

  const nonceTask = buildUtilsTask(
    task([...prefix, "fetch", "nonce"], "Print the nonce of an address")
      .addPositionalArgument({
        name: "address",
        description: "The address to check",
      })
      .addOption(BLOCK_OPTION),
    async () => await import("./nonce.js"),
  );

  return [
    fetchTask,
    balanceTask,
    blockNumberTask,
    chainIdTask,
    gasPriceTask,
    nonceTask,
  ];
}
