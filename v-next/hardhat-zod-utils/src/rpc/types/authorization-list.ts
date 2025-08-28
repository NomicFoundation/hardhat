import type { ZodType } from "zod";

import { z } from "zod";

import { rpcAddress } from "./address.js";
import { rpcHash } from "./hash.js";
import { rpcQuantity } from "./quantity.js";
import { rpcParity } from "./rpc-parity.js";

const rpcAuthorizationListTuple: ZodType<{
  chainId: bigint;
  address: Uint8Array;
  nonce: bigint;
  yParity: Uint8Array;
  r: Uint8Array;
  s: Uint8Array;
}> = z.object({
  chainId: rpcQuantity,
  address: rpcAddress,
  nonce: rpcQuantity,
  yParity: rpcParity,
  r: rpcHash,
  s: rpcHash,
});

export type RpcAuthorizationListTuple = z.infer<
  typeof rpcAuthorizationListTuple
>;

export const rpcAuthorizationList: ZodType<RpcAuthorizationListTuple[]> =
  z.array(rpcAuthorizationListTuple);
