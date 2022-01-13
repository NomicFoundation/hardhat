"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeSenderAccessListEIP2930Transaction = void 0;
const tx_1 = require("@ethereumjs/tx");
const ethereumjs_util_1 = require("ethereumjs-util");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/**
 * This class is the EIP-2930 version of FakeSenderTransaction.
 */
class FakeSenderAccessListEIP2930Transaction extends tx_1.AccessListEIP2930Transaction {
    constructor(sender, data = {}, opts) {
        var _a, _b, _c;
        super(Object.assign(Object.assign({}, data), { v: (_a = data.v) !== null && _a !== void 0 ? _a : new ethereumjs_util_1.BN(1), r: (_b = data.r) !== null && _b !== void 0 ? _b : new ethereumjs_util_1.BN(1), s: (_c = data.s) !== null && _c !== void 0 ? _c : new ethereumjs_util_1.BN(2) }), Object.assign(Object.assign({}, opts), { freeze: false }));
        this.common = this._getCommon(opts === null || opts === void 0 ? void 0 : opts.common);
        this._sender = sender;
    }
    static fromTxData(_txData, _opts) {
        throw new errors_1.InternalError("`fromTxData` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    static fromSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    static fromRlpSerializedTx(_serialized, _opts) {
        throw new errors_1.InternalError("`fromRlpSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    static fromValuesArray(_values, _opts) {
        throw new errors_1.InternalError("`fromValuesArray` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    static fromSenderAndRlpSerializedTx(sender, serialized, opts) {
        if (serialized[0] !== 1) {
            throw new errors_1.InvalidArgumentsError(`Invalid serialized tx input: not an EIP-2930 transaction (wrong tx type, expected: 1, received: ${serialized[0]}`);
        }
        const values = ethereumjs_util_1.rlp.decode(serialized.slice(1));
        if (!Array.isArray(values)) {
            throw new errors_1.InvalidArgumentsError("Invalid serialized tx input. Must be array");
        }
        return this.fromSenderAndValuesArray(sender, values, opts);
    }
    static fromSenderAndValuesArray(sender, values, opts = {}) {
        if (values.length !== 8 && values.length !== 11) {
            throw new errors_1.InvalidArgumentsError("Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx).");
        }
        const [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s,] = values;
        return new FakeSenderAccessListEIP2930Transaction(sender, {
            chainId,
            nonce,
            gasPrice,
            gasLimit,
            to: to !== undefined && to.length > 0 ? to : undefined,
            value,
            data: data !== null && data !== void 0 ? data : Buffer.from([]),
            accessList: accessList !== null && accessList !== void 0 ? accessList : [],
            v: v !== undefined ? new ethereumjs_util_1.BN(v) : undefined,
            r: r !== undefined && r.length !== 0 ? new ethereumjs_util_1.BN(r) : undefined,
            s: s !== undefined && s.length !== 0 ? new ethereumjs_util_1.BN(s) : undefined,
        }, opts);
    }
    verifySignature() {
        return true;
    }
    getSenderAddress() {
        return this._sender;
    }
    getSenderPublicKey() {
        throw new errors_1.InternalError("`getSenderPublicKey` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    _processSignature(_v, _r, _s) {
        throw new errors_1.InternalError("`_processSignature` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    sign(_privateKey) {
        throw new errors_1.InternalError("`sign` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    getMessageToSign() {
        throw new errors_1.InternalError("`getMessageToSign` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    getMessageToVerifySignature() {
        throw new errors_1.InternalError("`getMessageToVerifySignature` is not implemented in FakeSenderAccessListEIP2930Transaction");
    }
    validate(stringError = false) {
        if (stringError) {
            return [];
        }
        return true;
    }
}
exports.FakeSenderAccessListEIP2930Transaction = FakeSenderAccessListEIP2930Transaction;
//# sourceMappingURL=FakeSenderAccessListEIP2930Transaction.js.map