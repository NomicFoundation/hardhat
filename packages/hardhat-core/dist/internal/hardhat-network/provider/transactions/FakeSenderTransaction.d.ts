/// <reference types="node" />
import Common from "@ethereumjs/common";
import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import { Address } from "ethereumjs-util";
/**
 * This class represents a legacy transaction sent by a sender whose private
 * key we don't control.
 *
 * The transaction's signature is never validated, but assumed to be valid.
 *
 * The sender's private key is never recovered from the signature. Instead,
 * the sender's address is received as parameter.
 */
export declare class FakeSenderTransaction extends Transaction {
    static fromTxData(_txData: TxData, _opts?: TxOptions): never;
    static fromSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromRlpSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromValuesArray(_values: Buffer[], _opts?: TxOptions): never;
    static fromSenderAndRlpSerializedTx(sender: Address, serialized: Buffer, opts?: TxOptions): FakeSenderTransaction;
    static fromSenderAndValuesArray(sender: Address, values: Buffer[], opts?: TxOptions): FakeSenderTransaction;
    readonly common: Common;
    private readonly _sender;
    constructor(sender: Address, data?: TxData, opts?: TxOptions);
    verifySignature(): boolean;
    getSenderAddress(): Address;
    sign(): never;
    getSenderPublicKey(): never;
    getMessageToVerifySignature(): never;
    getMessageToSign(): never;
    validate(stringError?: false): boolean;
    validate(stringError: true): string[];
}
//# sourceMappingURL=FakeSenderTransaction.d.ts.map