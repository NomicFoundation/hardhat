/// <reference types="node" />
import Common from "@ethereumjs/common";
import { FeeMarketEIP1559Transaction, TxOptions } from "@ethereumjs/tx";
import { Address } from "ethereumjs-util";
import { FeeMarketEIP1559TxData, FeeMarketEIP1559ValuesArray } from "@ethereumjs/tx/src/types";
/**
 * This class is like `ReadOnlyValidTransaction` but for EIP-1559 transactions.
 */
export declare class ReadOnlyValidEIP1559Transaction extends FeeMarketEIP1559Transaction {
    static fromTxData(_txData: FeeMarketEIP1559TxData, _opts?: TxOptions): never;
    static fromSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromRlpSerializedTx(_serialized: Buffer, _opts?: TxOptions): never;
    static fromValuesArray(_values: FeeMarketEIP1559ValuesArray, _opts?: TxOptions): never;
    readonly common: Common;
    private readonly _sender;
    constructor(sender: Address, data?: FeeMarketEIP1559TxData);
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
//# sourceMappingURL=ReadOnlyValidEIP1559Transaction.d.ts.map