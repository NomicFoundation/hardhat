"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Module = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
const packageInfo_1 = require("../../../util/packageInfo");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class Web3Module {
    async processRequest(method, params = []) {
        switch (method) {
            case "web3_clientVersion":
                return this._clientVersionAction(...this._clientVersionParams(params));
            case "web3_sha3":
                return this._sha3Action(...this._sha3Params(params));
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // web3_clientVersion
    _clientVersionParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _clientVersionAction() {
        const hardhatPackage = await (0, packageInfo_1.getPackageJson)();
        const ethereumjsVMPackage = require("@ethereumjs/vm/package.json");
        return `HardhatNetwork/${hardhatPackage.version}/@ethereumjs/vm/${ethereumjsVMPackage.version}`;
    }
    // web3_sha3
    _sha3Params(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcData);
    }
    async _sha3Action(buffer) {
        return (0, base_types_1.bufferToRpcData)((0, ethereumjs_util_1.keccak256)(buffer));
    }
}
exports.Web3Module = Web3Module;
//# sourceMappingURL=web3.js.map