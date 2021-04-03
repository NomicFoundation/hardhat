import * as t from "io-ts";

import { nullable, optional } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../base-types";

export type RpcTransaction = t.TypeOf<typeof rpcTransaction>;
export const rpcTransaction = t.type(
  {
    blockHash: nullable(rpcHash),
    blockNumber: nullable(rpcQuantity),
    from: rpcAddress,
    gas: rpcQuantity,
    gasPrice: rpcQuantity,
    hash: rpcHash,
    input: rpcData,
    nonce: rpcQuantity,
    to: optional(nullable(rpcAddress)),
    transactionIndex: nullable(rpcQuantity),
    value: rpcQuantity,
    v: rpcQuantity,
    r: rpcQuantity,
    s: rpcQuantity,
  },
  "RpcTransaction"
);
