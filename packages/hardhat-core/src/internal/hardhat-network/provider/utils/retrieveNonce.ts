import { BN, toBuffer } from "ethereumjs-util";

import { SerializedTransaction } from "../PoolState";

export function retrieveNonce(tx: SerializedTransaction) {
  return new BN(toBuffer(tx.get(0)));
}
