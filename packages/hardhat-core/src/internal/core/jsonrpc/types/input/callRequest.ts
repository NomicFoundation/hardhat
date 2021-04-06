import * as t from "io-ts";

import { optional } from "../../../../util/io-ts";
import { rpcAccessList } from "../access-list";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

// Type used by eth_call and eth_estimateGas
export const rpcCallRequest = t.type(
  {
    from: optional(rpcAddress),
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    data: optional(rpcData),
    accessList: optional(rpcAccessList),
  },
  "RpcCallRequest"
);

export type RpcCallRequest = t.TypeOf<typeof rpcCallRequest>;
