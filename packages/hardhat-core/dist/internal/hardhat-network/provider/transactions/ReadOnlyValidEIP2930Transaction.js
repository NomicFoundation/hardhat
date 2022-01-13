"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadOnlyValidEIP2930Transaction = void 0;
const common_1 = __importDefault(require("@ethereumjs/common"));
const tx_1 = require("@ethereumjs/tx");
const ethereumjs_util_1 = require("ethereumjs-util");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/**
 * This class is like `ReadOnlyValidTransaction` but for
 * EIP-2930 (access list) transactions.
 */
class ReadOnlyValidEIP2930Transaction extends tx_1.AccessListEIP2930Transaction {
    constructor(sender, data = {}) {
        const fakeCommon = new common_1.default({
            chain: "mainnet",
        });
        // this class should only be used with txs in a hardfork that
        // supports EIP-2930
        fakeCommon.isActivatedEIP = (eip) => {
            if (eip === 2930) {
                return true;
            }
            throw new Error("Expected `isActivatedEIP` to only be called with 2930");
        };
        // this class should only be used with EIP-2930 txs,
        // which (we assume) always have a defined `chainId` value
        fakeCommon.chainIdBN = () => {
            if (data.chainId !== undefined) {
                return new ethereumjs_util_1.BN(data.chainId);
            }
            throw new Error("Expected txData to have a chainId");
        };
        super(data, { freeze: false, common: fakeCommon });
        this.common = fakeCommon;
        this._sender = sender;
    }
    static fromTxData(_txData, _opts) {
        throw new errors_1.InternalError("`fromTxData` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    static fromSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    static fromRlpSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    static fromValuesArray(_values, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    verifySignature() {
        return true;
    }
    getSenderAddress() {
        return this._sender;
    }
    sign() {
        throw new errors_1.InternalError("`sign` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getDataFee() {
        throw new errors_1.InternalError("`getDataFee` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getBaseFee() {
        throw new errors_1.InternalError("`getBaseFee` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getUpfrontCost() {
        throw new errors_1.InternalError("`getUpfrontCost` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    validate(_stringError = false) {
        throw new errors_1.InternalError("`validate` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    toCreationAddress() {
        throw new errors_1.InternalError("`toCreationAddress` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getSenderPublicKey() {
        throw new errors_1.InternalError("`getSenderPublicKey` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getMessageToVerifySignature() {
        throw new errors_1.InternalError("`getMessageToVerifySignature` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
    getMessageToSign() {
        throw new errors_1.InternalError("`getMessageToSign` is not implemented in ReadOnlyValidEIP2930Transaction");
    }
}
exports.ReadOnlyValidEIP2930Transaction = ReadOnlyValidEIP2930Transaction;
//# sourceMappingURL=ReadOnlyValidEIP2930Transaction.js.map