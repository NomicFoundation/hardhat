import * as t from "io-ts";

import { nullable, optional } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../base-types";

const rpcAccessListItem = t.type({
  address: rpcData,
  storageKeys: t.array(rpcData),
});

export const rpcAccessList = t.array(rpcAccessListItem);

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
    // This is also optional because Alchemy doesn't return to for deployment txs
    to: optional(nullable(rpcAddress)),
    transactionIndex: nullable(rpcQuantity),
    value: rpcQuantity,
    v: rpcQuantity,
    r: rpcQuantity,
    s: rpcQuantity,

    // EIP-2929/2930 properties
    type: optional(rpcQuantity),
    chainId: optional(nullable(rpcQuantity)),
    accessList: optional(rpcAccessList),
  },
  "RpcTransaction"
);
