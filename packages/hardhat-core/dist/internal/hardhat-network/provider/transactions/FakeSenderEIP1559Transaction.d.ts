/// <reference types="node" />
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import { FeeMarketEIP1559TxData, FeeMarketEIP1559ValuesArray, TxOptions } from "@ethereumjs/tx/dist/types";
import { Address } from "ethereumjs-util";
/**
 * This class is the EIP-1559 version of FakeSenderTransaction.
 */
export declare class FakeSenderEIP1559Transaction extends FeeMarketEIP1559Transaction {
    static fromTxData(_txData: FeeMarketEIP1559TxData, _opts?: TxOptions): never;
    static fromSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromRlpSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromValuesArray(_values: FeeMarketEIP1559ValuesArray, _opts?: TxOptions): never;
    static fromSenderAndRlpSerializedTx(sender: Address, serialized: Buffer, opts?: TxOptions): FakeSenderEIP1559Transaction;
    static fromSenderAndValuesArray(sender: Address, values: FeeMarketEIP1559ValuesArray, opts?: TxOptions): FakeSenderEIP1559Transaction;
    private readonly _sender;
    constructor(sender: Address, data?: FeeMarketEIP1559TxData, opts?: TxOptions);
    verifySignature(): boolean;
    getSenderAddress(): Address;
    getSenderPublicKey(): never;
    _processSignature(_v: number, _r: Buffer, _s: Buffer): never;
    sign(_privateKey: Buffer): never;
    getMessageToSign(): never;
    getMessageToVerifySignature(): never;
    validate(stringError?: false): boolean;
    validate(stringError: true): string[];
}
//# sourceMappingURL=FakeSenderEIP1559Transaction.d.ts.map