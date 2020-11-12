import { Transaction } from "ethereumjs-tx";
import { BN, toBuffer } from "ethereumjs-util";

// This is a helper function which sets the gas limit of a transaction making sure that the sender address is not
// changed.
//
// This is necessary because Transaction.getSenderAddress method retrieves the sender address from the transaction
// signature and hash which is affected by the change of gas limit value. However the getSenderAddress method is
// designed to cache the sender address value on first call, which we use to our advantage.
export function setTemporaryGasLimit(
  tx: Transaction,
  gasLimit: number | BN | Buffer
) {
  const initialGasLimit = tx.gasLimit;

  cacheSenderAddress(tx);
  tx.gasLimit = toBuffer(gasLimit);

  return () => {
    tx.gasLimit = initialGasLimit;
  };
}

function cacheSenderAddress(tx: Transaction) {
  // tslint:disable-next-line:no-string-literal
  if (tx["_from"] === undefined) {
    tx.getSenderAddress();
  }
}
