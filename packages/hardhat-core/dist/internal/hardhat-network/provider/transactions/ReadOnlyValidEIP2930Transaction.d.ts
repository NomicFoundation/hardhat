/// <reference types="node" />
import Common from "@ethereumjs/common";
import { AccessListEIP2930Transaction, AccessListEIP2930TxData, AccessListEIP2930ValuesArray, TxOptions } from "@ethereumjs/tx";
import { Address } from "ethereumjs-util";
/**
 * This class is like `ReadOnlyValidTransaction` but for
 * EIP-2930 (access list) transactions.
 */
export declare class ReadOnlyValidEIP2930Transaction extends AccessListEIP2930Transaction {
    static fromTxData(_txData: AccessListEIP2930TxData, _opts?: TxOptions): never;
    static fromSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromRlpSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromValuesArray(_values: AccessListEIP2930ValuesArray, _opts?: TxOptions): never;
    readonly common: Common;
    private readonly _sender;
    constructor(sender: Address, data?: AccessListEIP2930TxData);
    verifySignature(): boolean;
    getSenderAddress(): Address;
    sign(): never;
    getDataFee(): never;
    getBaseFee(): never;
    getUpfrontCost(): never;
    validate(stringError?: false): never;
    validate(stringError: true): never;
    toCreationAddress(): never;
    getSenderPublicKey(): never;
    getMessageToVerifySignature(): never;
    getMessageToSign(): never;
}
//# sourceMappingURL=ReadOnlyValidEIP2930Transaction.d.ts.map