import * as t from "io-ts";

import { nullable } from "./io-ts.js";
import { rpcData } from "./rpc.js";

const rpcAccessListTuple: t.TypeC<{
  address: t.Type<Buffer, Buffer, unknown>;
  storageKeys: t.Type<Buffer[] | null, Buffer[] | null, unknown>;
}> = t.type({
  address: rpcData,
  storageKeys: nullable(t.array(rpcData)),
});

export const rpcAccessList: t.ArrayC<
  t.TypeC<{
    address: t.Type<Buffer, Buffer, unknown>;
    storageKeys: t.Type<Buffer[] | null, Buffer[] | null, unknown>;
  }>
> = t.array(rpcAccessListTuple);

export type RpcAccessListTuple = t.TypeOf<typeof rpcAccessListTuple>;

export type RpcAccessList = t.TypeOf<typeof rpcAccessList>;
