import { AccessListEIP2930TxData, TxData } from "@ethereumjs/tx";

import { FeeMarketEIP1559TxData } from "@ethereumjs/tx/dist/types";
import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";

export function rpcToTxData(
  rpcTransaction: RpcTransaction
): TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData {
  const isEip1559 = rpcTransaction.type?.eqn(2) ?? false;

  return {
    gasLimit: rpcTransaction.gas,
    // NOTE: RPC EIP-1559 txs still have this field for backwards compatibility,
    //  but FeeMarketEIP1559TxData doesn't.
    gasPrice: isEip1559 ? undefined : rpcTransaction.gasPrice,
    to: rpcTransaction.to ?? undefined,
    nonce: rpcTransaction.nonce,
    data: rpcTransaction.input,
    v: rpcTransaction.v,
    r: rpcTransaction.r,
    s: rpcTransaction.s,
    value: rpcTransaction.value,
    type: rpcTransaction.type,
    chainId: rpcTransaction.chainId ?? undefined,
    maxFeePerGas: rpcTransaction.maxFeePerGas,
    maxPriorityFeePerGas: rpcTransaction.maxPriorityFeePerGas,
    accessList: rpcTransaction.accessList?.map((item) => [
      item.address,
      item.storageKeys ?? [],
    ]),
  };
}
