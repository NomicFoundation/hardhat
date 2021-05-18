import { AccessListEIP2930TxData, TxData } from "@ethereumjs/tx";

import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";

export function rpcToTxData(
  rpcTransaction: RpcTransaction
): TxData | AccessListEIP2930TxData {
  const txData: AccessListEIP2930TxData = {
    gasLimit: rpcTransaction.gas,
    gasPrice: rpcTransaction.gasPrice,
    to: rpcTransaction.to ?? undefined,
    nonce: rpcTransaction.nonce,
    data: rpcTransaction.input,
    v: rpcTransaction.v,
    r: rpcTransaction.r,
    s: rpcTransaction.s,
    value: rpcTransaction.value,
  };

  if (rpcTransaction.type !== undefined) {
    txData.type = rpcTransaction.type;
  }
  if (rpcTransaction.chainId !== undefined && rpcTransaction.chainId !== null) {
    txData.chainId = rpcTransaction.chainId;
  }
  if (rpcTransaction.accessList !== undefined) {
    txData.accessList = rpcTransaction.accessList.map((item) => [
      item.address,
      item.storageKeys ?? [],
    ]);
  }

  return txData;
}
