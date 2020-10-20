import { BN, toBuffer } from "ethereumjs-util";

import { OrderedRecord } from "../PoolState";

export function retrieveNonce(tx: OrderedRecord) {
  return new BN(toBuffer(tx.get("data").get(0)));
}
