"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeForkCommon = void 0;
const common_1 = __importDefault(require("@ethereumjs/common"));
async function makeForkCommon(config) {
    return common_1.default.forCustomChain("mainnet", {
        chainId: config.chainId,
        networkId: config.networkId,
        name: config.networkName,
    }, config.hardfork);
}
exports.makeForkCommon = makeForkCommon;
//# sourceMappingURL=makeForkCommon.js.map