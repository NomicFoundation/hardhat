import type { ZodType } from "zod";

import { z } from "zod";

import { rpcAccessList } from "./access-list.js";
import { nullableRpcAddress, rpcAddress } from "./address.js";
import { rpcData } from "./data.js";
import { rpcHash } from "./hash.js";
import { rpcQuantity } from "./quantity.js";

const optional = <T extends ZodType<any>>(schema: T) => schema.optional();

export interface RpcTransactionRequest {
  from: Uint8Array;
  to?: Uint8Array | null;
  gas?: bigint;
  gasPrice?: bigint;
  value?: bigint;
  nonce?: bigint;
  data?: Uint8Array;
  accessList?: Array<{ address: Uint8Array; storageKeys: Uint8Array[] | null }>;
  chainId?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  blobs?: Uint8Array[];
  blobVersionedHashes?: Uint8Array[];
}

export const rpcTransactionRequest: ZodType<RpcTransactionRequest> = z.object({
  from: rpcAddress,
  to: optional(nullableRpcAddress),
  gas: optional(rpcQuantity),
  gasPrice: optional(rpcQuantity),
  value: optional(rpcQuantity),
  nonce: optional(rpcQuantity),
  data: optional(rpcData),
  accessList: optional(rpcAccessList),
  chainId: optional(rpcQuantity),
  maxFeePerGas: optional(rpcQuantity),
  maxPriorityFeePerGas: optional(rpcQuantity),
  blobs: optional(z.array(rpcData)),
  blobVersionedHashes: optional(z.array(rpcHash)),
});
