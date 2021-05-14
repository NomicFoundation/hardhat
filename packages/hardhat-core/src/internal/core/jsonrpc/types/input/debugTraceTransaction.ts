import * as t from "io-ts";

import { optional } from "../../../../util/io-ts";

export const rpcDebugTracingConfig = optional(
  t.type(
    {
      disableStorage: optional(t.boolean),
      disableMemory: optional(t.boolean),
      disableStack: optional(t.boolean),
    },
    "RpcDebugTracingConfig"
  )
);

export type RpcDebugTracingConfig = t.TypeOf<typeof rpcDebugTracingConfig>;
