import * as t from "io-ts";

import { rpcAccessList } from "./access-list.js";
import { optionalOrNullable } from "./io-ts.js";
import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "./rpc.js";

// Type used by eth_sendTransaction
export const rpcTransactionRequest: t.TypeC<{
  from: t.Type<Buffer, Buffer, unknown>;
  to: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
  gas: t.Type<bigint | undefined, bigint | undefined, unknown>;
  gasPrice: t.Type<bigint | undefined, bigint | undefined, unknown>;
  value: t.Type<bigint | undefined, bigint | undefined, unknown>;
  nonce: t.Type<bigint | undefined, bigint | undefined, unknown>;
  data: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
  accessList: t.Type<
    | Array<{
        address: Buffer;
        storageKeys: Buffer[] | null;
      }>
    | undefined,
    | Array<{
        address: Buffer;
        storageKeys: Buffer[] | null;
      }>
    | undefined,
    unknown
  >;
  chainId: t.Type<bigint | undefined, bigint | undefined, unknown>;
  maxFeePerGas: t.Type<bigint | undefined, bigint | undefined, unknown>;
  maxPriorityFeePerGas: t.Type<bigint | undefined, bigint | undefined, unknown>;
  blobs: t.Type<Buffer[] | undefined, Buffer[] | undefined, unknown>;
  blobVersionedHashes: t.Type<
    Buffer[] | undefined,
    Buffer[] | undefined,
    unknown
  >;
}> = t.type(
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
    maxFeePerGas: optionalOrNullable(rpcQuantity),
    maxPriorityFeePerGas: optionalOrNullable(rpcQuantity),
    blobs: optionalOrNullable(t.array(rpcData)),
    blobVersionedHashes: optionalOrNullable(t.array(rpcHash)),
  },
  "RpcTransactionRequest",
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
  accessList?: Array<{
    address: string;
    storageKeys: string[];
  }>;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  blobs?: string[];
  blobVersionedHashes?: string[];
}

export type RpcTransactionRequest = t.TypeOf<typeof rpcTransactionRequest>;
