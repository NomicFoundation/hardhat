import * as t from "io-ts";

// TS2742 workaround
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BN } from "ethereumjs-util";

import { nullable } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../base-types";

export type RpcLog = t.TypeOf<typeof rpcLog>;
export const rpcLog = t.type(
  {
    logIndex: nullable(rpcQuantity),
    transactionIndex: nullable(rpcQuantity),
    transactionHash: nullable(rpcHash),
    blockHash: nullable(rpcHash),
    blockNumber: nullable(rpcQuantity),
    address: rpcAddress,
    data: rpcData,
    topics: t.array(rpcData, "RpcData Array"),
  },
  "RpcLog"
);
