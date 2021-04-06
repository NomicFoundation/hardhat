import * as t from "io-ts";

import { optional } from "../../../../util/io-ts";
import { rpcAccessList } from "../access-list";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

// Type used by eth_sendTransaction
export const rpcTransactionRequest = t.type(
  {
    from: rpcAddress,
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    nonce: optional(rpcQuantity),
    data: optional(rpcData),
    accessList: optional(rpcAccessList),
    chainId: optional(rpcQuantity),
  },
  "RpcTransactionRequest"
);

// This type represents possibly valid inputs to rpcTransactionRequest.
// TODO: It can probably be inferred by io-ts.
export interface RpcTransactionRequestInput {
  from: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  nonce?: string;
  data?: string;
}

export type RpcTransactionRequest = t.TypeOf<typeof rpcTransactionRequest>;
