import {
  AccessListEIP2930Transaction,
  TransactionFactory,
} from "@ethereumjs/tx";
import { BaseTransaction } from "@ethereumjs/tx/dist/baseTransaction";
import {
  AccessListEIP2930TxData,
  TxData,
  TxOptions,
} from "@ethereumjs/tx/dist/types";

// TODO: Delete this before the release of Berlin
//  It's a workaround that is also included here: https://github.com/ethereumjs/ethereumjs-monorepo/pull/1185
if (!("type" in AccessListEIP2930Transaction.prototype)) {
  Object.defineProperty(AccessListEIP2930Transaction.prototype, "type", {
    get() {
      return this.transactionType;
    },
  });
}

// This is a hack to prevent Block.fromBlockData from recreating our
// transactions and changing their types. Note fromBlockData is used
// by the BlockBuilder to update block it's building.
const previousFromTxData = TransactionFactory.fromTxData;
(TransactionFactory as any).fromTxData = function (
  txData: TxData | AccessListEIP2930TxData,
  txOptions?: TxOptions
) {
  if (txData instanceof BaseTransaction) {
    return txData;
  }

  return previousFromTxData.call(this, txData, txOptions);
};
