"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadOnlyValidTransaction = void 0;
const tx_1 = require("@ethereumjs/tx");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/**
 * This class represents a transaction that is assumed to be valid.
 *
 * This transaction is not meant to be run. It can only be used to read
 * from its values.
 *
 * The transaction's signature is never validated, but assumed to be valid.
 *
 * The sender's private key is never recovered from the signature. Instead,
 * the sender's address is received as parameter.
 *
 * This class doesn't use its Common instance, so there's no need to provide
 * one.
 */
class ReadOnlyValidTransaction extends tx_1.Transaction {
    constructor(sender, data = {}) {
        super(data, { freeze: false });
        this.common = this._getCommon();
        this._sender = sender;
    }
    static fromTxData(_txData, _opts) {
        throw new errors_1.InternalError("`fromTxData` is not implemented in ReadOnlyValidTransaction");
    }
    static fromSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromSerializedTx` is not implemented in ReadOnlyValidTransaction");
    }
    static fromRlpSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in ReadOnlyValidTransaction");
    }
    static fromValuesArray(_values, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in ReadOnlyValidTransaction");
    }
    verifySignature() {
        return true;
    }
    getSenderAddress() {
        return this._sender;
    }
    sign() {
        throw new errors_1.InternalError("`sign` is not implemented in ReadOnlyValidTransaction");
    }
    getDataFee() {
        throw new errors_1.InternalError("`getDataFee` is not implemented in ReadOnlyValidTransaction");
    }
    getBaseFee() {
        throw new errors_1.InternalError("`getBaseFee` is not implemented in ReadOnlyValidTransaction");
    }
    getUpfrontCost() {
        throw new errors_1.InternalError("`getUpfrontCost` is not implemented in ReadOnlyValidTransaction");
    }
    validate(_stringError = false) {
        throw new errors_1.InternalError("`validate` is not implemented in ReadOnlyValidTransaction");
    }
    toCreationAddress() {
        throw new errors_1.InternalError("`toCreationAddress` is not implemented in ReadOnlyValidTransaction");
    }
    getSenderPublicKey() {
        throw new errors_1.InternalError("`getSenderPublicKey` is not implemented in ReadOnlyValidTransaction");
    }
    getMessageToVerifySignature() {
        throw new errors_1.InternalError("`getMessageToVerifySignature` is not implemented in ReadOnlyValidTransaction");
    }
    getMessageToSign() {
        throw new errors_1.InternalError("`getMessageToSign` is not implemented in ReadOnlyValidTransaction");
    }
}
exports.ReadOnlyValidTransaction = ReadOnlyValidTransaction;
// Override private methods
const ReadOnlyValidTransactionPrototype = ReadOnlyValidTransaction.prototype;
ReadOnlyValidTransactionPrototype._validateTxV = function (_v, common) {
    return this._getCommon(common);
};
ReadOnlyValidTransactionPrototype._signedTxImplementsEIP155 = function () {
    throw new errors_1.InternalError("`_signedTxImplementsEIP155` is not implemented in ReadOnlyValidTransaction");
};
ReadOnlyValidTransactionPrototype._unsignedTxImplementsEIP155 = function () {
    throw new errors_1.InternalError("`_unsignedTxImplementsEIP155` is not implemented in ReadOnlyValidTransaction");
};
ReadOnlyValidTransactionPrototype._getMessageToSign = function () {
    throw new errors_1.InternalError("`_getMessageToSign` is not implemented in ReadOnlyValidTransaction");
};
ReadOnlyValidTransactionPrototype._processSignature = function () {
    throw new errors_1.InternalError("`_processSignature` is not implemented in ReadOnlyValidTransaction");
};
//# sourceMappingURL=ReadOnlyValidTransaction.js.map