"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcToTxData = void 0;
function rpcToTxData(rpcTransaction) {
    var _a, _b, _c, _d, _e;
    const isEip1559 = (_b = (_a = rpcTransaction.type) === null || _a === void 0 ? void 0 : _a.eqn(2)) !== null && _b !== void 0 ? _b : false;
    return {
        gasLimit: rpcTransaction.gas,
        // NOTE: RPC EIP-1559 txs still have this field for backwards compatibility,
        //  but FeeMarketEIP1559TxData doesn't.
        gasPrice: isEip1559 ? undefined : rpcTransaction.gasPrice,
        to: (_c = rpcTransaction.to) !== null && _c !== void 0 ? _c : undefined,
        nonce: rpcTransaction.nonce,
        data: rpcTransaction.input,
        v: rpcTransaction.v,
        r: rpcTransaction.r,
        s: rpcTransaction.s,
        value: rpcTransaction.value,
        type: rpcTransaction.type,
        chainId: (_d = rpcTransaction.chainId) !== null && _d !== void 0 ? _d : undefined,
        maxFeePerGas: rpcTransaction.maxFeePerGas,
        maxPriorityFeePerGas: rpcTransaction.maxPriorityFeePerGas,
        accessList: (_e = rpcTransaction.accessList) === null || _e === void 0 ? void 0 : _e.map((item) => {
            var _a;
            return [
                item.address,
                (_a = item.storageKeys) !== null && _a !== void 0 ? _a : [],
            ];
        }),
    };
}
exports.rpcToTxData = rpcToTxData;
//# sourceMappingURL=rpcToTxData.js.map