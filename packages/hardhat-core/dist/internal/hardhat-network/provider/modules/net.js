"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetModule = void 0;
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class NetModule {
    constructor(_common) {
        this._common = _common;
    }
    async processRequest(method, params = []) {
        switch (method) {
            case "net_listening":
                return this._listeningAction(...this._listeningParams(params));
            case "net_peerCount":
                return this._peerCountAction(...this._peerCountParams(params));
            case "net_version":
                return this._versionAction(...this._versionParams(params));
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // net_listening
    _listeningParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _listeningAction() {
        return true;
    }
    // net_peerCount
    _peerCountParams(_params) {
        return [];
    }
    async _peerCountAction() {
        return (0, base_types_1.numberToRpcQuantity)(0);
    }
    // net_version
    _versionParams(_params) {
        return [];
    }
    async _versionAction() {
        // This RPC call is an exception: it returns a number in decimal
        return this._common.networkId().toString();
    }
}
exports.NetModule = NetModule;
//# sourceMappingURL=net.js.map