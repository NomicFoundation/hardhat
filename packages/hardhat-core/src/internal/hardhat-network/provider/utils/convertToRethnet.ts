import { AccessListEIP2930Transaction, FeeMarketEIP1559Transaction, TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Config, Rethnet, Transaction } from "rethnet-evm";
import { HardhatDB } from "rethnet-evm/db";

export function ethereumjsTransactionToRethnet(tx: TypedTransaction): Transaction {

  const chainId = (tx: TypedTransaction) => {
    if (tx as AccessListEIP2930Transaction) {
      return (tx as AccessListEIP2930Transaction).chainId;
    }
    else if (tx as FeeMarketEIP1559Transaction) {
      return (tx as FeeMarketEIP1559Transaction).chainId;
    } else {
      return undefined;
    }
  };

  const rethnetTx: Transaction = {
    from: tx.getSenderAddress().toBuffer(),
    to: tx.to?.buf,
    gasLimit: tx.gasLimit,
    gasPrice: (tx as FeeMarketEIP1559Transaction)?.maxFeePerGas ?? (tx as any).gasPrice,
    gasPriorityFee: (tx as FeeMarketEIP1559Transaction)?.maxPriorityFeePerGas,
    value: tx.value,
    nonce: tx.nonce,
    input: tx.data,
    accessList: (tx as AccessListEIP2930Transaction)?.AccessListJSON,
    chainId: chainId(tx),
  }

  return rethnetTx;
}

export function createRethnetFromHardhatDB(cfg: Config, hardhatDB: HardhatDB): Rethnet {
  return Rethnet.withCallbacks(
    cfg,
    {
      getAccountByAddressFn:
        HardhatDB.prototype.getAccountByAddress.bind(hardhatDB),
      getAccountStorageSlotFn:
        HardhatDB.prototype.getAccountStorageSlot.bind(hardhatDB),
      getBlockHashFn: HardhatDB.prototype.getBlockHash.bind(hardhatDB),
      getCodeByHashFn: HardhatDB.prototype.getCodeByHash.bind(hardhatDB),
    },
    null,
    {
      checkpointFn: HardhatDB.prototype.checkpoint.bind(hardhatDB),
      revertFn: HardhatDB.prototype.revert.bind(hardhatDB),
      getStorageRootFn: HardhatDB.prototype.getStorageRoot.bind(hardhatDB),
      insertAccountFn: HardhatDB.prototype.insertAccount.bind(hardhatDB),
      setAccountBalanceFn:
        HardhatDB.prototype.setAccountBalance.bind(hardhatDB),
      setAccountCodeFn: HardhatDB.prototype.setAccountCode.bind(hardhatDB),
      setAccountNonceFn: HardhatDB.prototype.setAccountNonce.bind(hardhatDB),
      setAccountStorageSlotFn:
        HardhatDB.prototype.setAccountStorageSlot.bind(hardhatDB),
    }
  );
}
