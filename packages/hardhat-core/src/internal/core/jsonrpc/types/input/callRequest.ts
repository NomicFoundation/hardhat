import * as t from "io-ts";

import { optional } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

// Type used by eth_call and eth_estimateGas
// TODO: Update to Berlin
export const rpcCallRequest = t.type(
  {
    from: optional(rpcAddress),
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    data: optional(rpcData),
  },
  "RpcCallRequest"
);

export interface RpcCallRequestInput {
  from?: string;
  to: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
}

export type RpcCallRequest = t.TypeOf<typeof rpcCallRequest>;
