import * as t from "io-ts";

import { optional } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcQuantity } from "../base-types";

export const rpcTransactionRequest = t.type(
  {
    from: rpcAddress,
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    data: optional(rpcData),
    nonce: optional(rpcQuantity),
  },
  "RpcTransactionRequest"
);

export interface RpcTransactionRequestInput {
  from: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  nonce?: string;
}

export type RpcTransactionRequest = t.TypeOf<typeof rpcTransactionRequest>;
