import * as t from "io-ts";

import { optionalOrNullable } from "../../../../util/io-ts";
import { rpcAccessList } from "../access-list";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

// Type used by eth_sendTransaction
export const rpcTransactionRequest = t.type(
  {
    from: rpcAddress,
    to: optionalOrNullable(rpcAddress),
    gas: optionalOrNullable(rpcQuantity),
    gasPrice: optionalOrNullable(rpcQuantity),
    value: optionalOrNullable(rpcQuantity),
    nonce: optionalOrNullable(rpcQuantity),
    data: optionalOrNullable(rpcData),
    accessList: optionalOrNullable(rpcAccessList),
    chainId: optionalOrNullable(rpcQuantity),
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
