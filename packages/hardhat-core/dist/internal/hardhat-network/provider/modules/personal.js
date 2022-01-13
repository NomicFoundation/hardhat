"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalModule = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class PersonalModule {
    constructor(_node) {
        this._node = _node;
    }
    async processRequest(method, params = []) {
        switch (method) {
            case "personal_sign": {
                return this._signAction(...this._signParams(params));
            }
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // personal_sign
    _signParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcData, base_types_1.rpcAddress);
    }
    async _signAction(data, address) {
        const signature = await this._node.signPersonalMessage(new ethereumjs_util_1.Address(address), data);
        return (0, ethereumjs_util_1.toRpcSig)(signature.v, signature.r, signature.s);
    }
}
exports.PersonalModule = PersonalModule;
//# sourceMappingURL=personal.js.map