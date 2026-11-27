import type { UtilsTaskDefinition } from "../../types.js";

import { task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function rpc(prefix: string[]): UtilsTaskDefinition[] {
  const rpcTask = buildUtilsTask(
    task(
      [...prefix, "rpc"],
      "Send a JSON-RPC request and print its result as JSON",
    )
      .addPositionalArgument({
        name: "method",
        description: "The JSON-RPC method, like eth_getBalance",
      })
      .addVariadicArgument({
        name: "params",
        description:
          'The method params, in order. Valid JSON, like false, 1 or {"to":"0x..."}, is sent as JSON; anything else, like 0x1 or latest, as a string',
        defaultValue: [],
      }),
    async () => await import("./rpc.js"),
  );

  return [rpcTask];
}
