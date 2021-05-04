import * as t from "io-ts";

import { rpcData } from "./base-types";

const rpcAccessListTuple = t.type({
  address: rpcData,
  storageKeys: t.array(rpcData),
});

export const rpcAccessList = t.array(rpcAccessListTuple);

export type RpcAccessListTuple = t.TypeOf<typeof rpcAccessListTuple>;

export type RpcAccessList = t.TypeOf<typeof rpcAccessList>;
