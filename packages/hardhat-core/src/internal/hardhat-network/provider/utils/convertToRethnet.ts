import { AccessListEIP2930Transaction, FeeMarketEIP1559Transaction, TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Transaction } from "rethnet-evm";

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
