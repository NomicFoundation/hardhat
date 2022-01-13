"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeSenderTransaction = void 0;
const tx_1 = require("@ethereumjs/tx");
const ethereumjs_util_1 = require("ethereumjs-util");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/**
 * This class represents a legacy transaction sent by a sender whose private
 * key we don't control.
 *
 * The transaction's signature is never validated, but assumed to be valid.
 *
 * The sender's private key is never recovered from the signature. Instead,
 * the sender's address is received as parameter.
 */
class FakeSenderTransaction extends tx_1.Transaction {
    constructor(sender, data = {}, opts) {
        var _a, _b, _c;
        super(Object.assign(Object.assign({}, data), { v: (_a = data.v) !== null && _a !== void 0 ? _a : new ethereumjs_util_1.BN(27), r: (_b = data.r) !== null && _b !== void 0 ? _b : new ethereumjs_util_1.BN(1), s: (_c = data.s) !== null && _c !== void 0 ? _c : new ethereumjs_util_1.BN(2) }), Object.assign(Object.assign({}, opts), { freeze: false }));
        this.common = this._getCommon(opts === null || opts === void 0 ? void 0 : opts.common);
        this._sender = sender;
    }
    static fromTxData(_txData, _opts) {
        throw new errors_1.InternalError("`fromTxData` is not implemented in FakeSenderTransaction");
    }
    static fromSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromSerializedTx` is not implemented in FakeSenderTransaction");
    }
    static fromRlpSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in FakeSenderTransaction");
    }
    static fromValuesArray(_values, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in FakeSenderTransaction");
    }
    static fromSenderAndRlpSerializedTx(sender, serialized, opts) {
        const values = ethereumjs_util_1.rlp.decode(serialized);
        if (!Array.isArray(values)) {
            throw new Error("Invalid serialized tx input. Must be array");
        }
        return this.fromSenderAndValuesArray(sender, values, opts);
    }
    static fromSenderAndValuesArray(sender, values, opts) {
        if (values.length !== 6 && values.length !== 9) {
            throw new errors_1.InternalError("FakeSenderTransaction initialized with invalid values");
        }
        const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values;
        return new FakeSenderTransaction(sender, {
            nonce,
            gasPrice,
            gasLimit,
            to: to !== undefined && to.length > 0 ? to : undefined,
            value,
            data,
            v,
            r,
            s,
        }, opts);
    }
    verifySignature() {
        return true;
    }
    getSenderAddress() {
        return this._sender;
    }
    sign() {
        throw new errors_1.InternalError("`sign` is not implemented in FakeSenderTransaction");
    }
    getSenderPublicKey() {
        throw new errors_1.InternalError("`getSenderPublicKey` is not implemented in FakeSenderTransaction");
    }
    getMessageToVerifySignature() {
        throw new errors_1.InternalError("`getMessageToVerifySignature` is not implemented in FakeSenderTransaction");
    }
    getMessageToSign() {
        throw new errors_1.InternalError("`getMessageToSign` is not implemented in FakeSenderTransaction");
    }
    validate(stringError = false) {
        if (stringError) {
            return [];
        }
        return true;
    }
}
exports.FakeSenderTransaction = FakeSenderTransaction;
// Override private methods
const FakeSenderTransactionPrototype = FakeSenderTransaction.prototype;
FakeSenderTransactionPrototype._validateTxV = function (_v, common) {
    return this._getCommon(common);
};
FakeSenderTransactionPrototype._signedTxImplementsEIP155 = function () {
    throw new errors_1.InternalError("`_signedTxImplementsEIP155` is not implemented in FakeSenderTransaction");
};
FakeSenderTransactionPrototype._unsignedTxImplementsEIP155 = function () {
    throw new errors_1.InternalError("`_unsignedTxImplementsEIP155` is not implemented in FakeSenderTransaction");
};
FakeSenderTransactionPrototype._getMessageToSign = function () {
    throw new errors_1.InternalError("`_getMessageToSign` is not implemented in FakeSenderTransaction");
};
FakeSenderTransactionPrototype._processSignature = function () {
    throw new errors_1.InternalError("`_processSignature` is not implemented in FakeSenderTransaction");
};
//# sourceMappingURL=FakeSenderTransaction.js.map