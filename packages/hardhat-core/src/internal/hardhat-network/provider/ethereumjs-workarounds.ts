import { TransactionFactory } from "@nomicfoundation/ethereumjs-tx";
import { BaseTransaction } from "@nomicfoundation/ethereumjs-tx/dist/baseTransaction";
import {
  AccessListEIP2930TxData,
  TxData,
  TxOptions,
} from "@nomicfoundation/ethereumjs-tx/dist/types";

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
