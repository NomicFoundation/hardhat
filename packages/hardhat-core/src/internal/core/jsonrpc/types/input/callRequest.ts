import * as t from "io-ts";

// TS2742 workaround
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BN } from "ethereumjs-util";

import { optionalOrNullable } from "../../../../util/io-ts";
import { rpcAccessList } from "../access-list";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

// Type used by eth_call and eth_estimateGas
export const rpcCallRequest = t.type(
  {
    from: optionalOrNullable(rpcAddress),
    to: optionalOrNullable(rpcAddress),
    gas: optionalOrNullable(rpcQuantity),
    gasPrice: optionalOrNullable(rpcQuantity),
    value: optionalOrNullable(rpcQuantity),
    data: optionalOrNullable(rpcData),
    accessList: optionalOrNullable(rpcAccessList),
    maxFeePerGas: optionalOrNullable(rpcQuantity),
    maxPriorityFeePerGas: optionalOrNullable(rpcQuantity),
  },
  "RpcCallRequest"
);

export type RpcCallRequest = t.TypeOf<typeof rpcCallRequest>;
