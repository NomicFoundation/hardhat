import { BN, toBuffer } from "ethereumjs-util";
import { SerializedTransaction } from "../TransactionPool";

export function retrieveNonce(tx: SerializedTransaction) {
  return new BN(toBuffer(tx.get(0)));
}
