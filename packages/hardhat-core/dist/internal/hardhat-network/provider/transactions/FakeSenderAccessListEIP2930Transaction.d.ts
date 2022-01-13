/// <reference types="node" />
import Common from "@ethereumjs/common";
import { AccessListEIP2930Transaction } from "@ethereumjs/tx";
import { AccessListEIP2930TxData, AccessListEIP2930ValuesArray, TxOptions } from "@ethereumjs/tx/dist/types";
import { Address } from "ethereumjs-util";
/**
 * This class is the EIP-2930 version of FakeSenderTransaction.
 */
export declare class FakeSenderAccessListEIP2930Transaction extends AccessListEIP2930Transaction {
    static fromTxData(_txData: AccessListEIP2930TxData, _opts?: TxOptions): never;
    static fromSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromRlpSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromValuesArray(_values: AccessListEIP2930ValuesArray, _opts?: TxOptions): never;
    static fromSenderAndRlpSerializedTx(sender: Address, serialized: Buffer, opts?: TxOptions): FakeSenderAccessListEIP2930Transaction;
    static fromSenderAndValuesArray(sender: Address, values: AccessListEIP2930ValuesArray, opts?: TxOptions): FakeSenderAccessListEIP2930Transaction;
    readonly common: Common;
    private readonly _sender;
    constructor(sender: Address, data?: AccessListEIP2930TxData, opts?: TxOptions);
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
//# sourceMappingURL=FakeSenderAccessListEIP2930Transaction.d.ts.map