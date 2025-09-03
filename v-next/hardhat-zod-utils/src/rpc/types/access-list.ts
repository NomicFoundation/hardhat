import type { ZodType } from "zod";

import { z } from "zod";

import { rpcData } from "./data.js";

const nullable = <T extends ZodType<any>>(schema: T) => schema.nullable();

const rpcAccessListTuple: ZodType<{
  address: Uint8Array;
  storageKeys: Uint8Array[] | null;
}> = z.object({
  address: rpcData,
  storageKeys: nullable(z.array(rpcData)),
});

export type RpcAccessListTuple = z.infer<typeof rpcAccessListTuple>;

export const rpcAccessList: ZodType<RpcAccessListTuple[]> =
  z.array(rpcAccessListTuple);
