"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeForkClient = void 0;
const chalk_1 = __importDefault(require("chalk"));
const ethereumjs_util_1 = require("ethereumjs-util");
const constants_1 = require("../../../constants");
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const http_1 = require("../../../core/providers/http");
const client_1 = require("../../jsonrpc/client");
const reorgs_protection_1 = require("./reorgs-protection");
// TODO: This is a temporarily measure.
//  We must investigate why this timeouts so much. Apparently
//  node-fetch doesn't handle timeouts so well. The option was
//  removed in its new major version.
const FORK_HTTP_TIMEOUT = 35000;
async function makeForkClient(forkConfig, forkCachePath) {
    const provider = new http_1.HttpProvider(forkConfig.jsonRpcUrl, constants_1.HARDHAT_NETWORK_NAME, undefined, FORK_HTTP_TIMEOUT);
    const networkId = await getNetworkId(provider);
    const actualMaxReorg = (0, reorgs_protection_1.getLargestPossibleReorg)(networkId);
    const maxReorg = actualMaxReorg !== null && actualMaxReorg !== void 0 ? actualMaxReorg : reorgs_protection_1.FALLBACK_MAX_REORG;
    const latestBlock = await getLatestBlockNumber(provider);
    const lastSafeBlock = latestBlock - maxReorg;
    let forkBlockNumber;
    if (forkConfig.blockNumber !== undefined) {
        if (forkConfig.blockNumber > latestBlock) {
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw new Error(`Trying to initialize a provider with block ${forkConfig.blockNumber} but the current block is ${latestBlock}`);
        }
        if (forkConfig.blockNumber > lastSafeBlock) {
            const confirmations = latestBlock - forkConfig.blockNumber + 1;
            const requiredConfirmations = maxReorg + 1;
            console.warn(chalk_1.default.yellow(`You are forking from block ${forkConfig.blockNumber}, which has less than ${requiredConfirmations} confirmations, and will affect Hardhat Network's performance.
Please use block number ${lastSafeBlock} or wait for the block to get ${requiredConfirmations - confirmations} more confirmations.`));
        }
        forkBlockNumber = new ethereumjs_util_1.BN(forkConfig.blockNumber);
    }
    else {
        forkBlockNumber = new ethereumjs_util_1.BN(lastSafeBlock);
    }
    const block = await getBlockByNumber(provider, forkBlockNumber);
    const forkBlockTimestamp = (0, base_types_1.rpcQuantityToNumber)(block.timestamp) * 1000;
    const cacheToDiskEnabled = forkConfig.blockNumber !== undefined &&
        forkCachePath !== undefined &&
        actualMaxReorg !== undefined;
    const forkClient = new client_1.JsonRpcClient(provider, networkId, latestBlock, maxReorg, cacheToDiskEnabled ? forkCachePath : undefined);
    return { forkClient, forkBlockNumber, forkBlockTimestamp };
}
exports.makeForkClient = makeForkClient;
async function getBlockByNumber(provider, blockNumber) {
    const rpcBlockOutput = (await provider.request({
        method: "eth_getBlockByNumber",
        params: [(0, base_types_1.numberToRpcQuantity)(blockNumber), false],
    }));
    return rpcBlockOutput;
}
async function getNetworkId(provider) {
    const networkIdString = (await provider.request({
        method: "net_version",
    }));
    return parseInt(networkIdString, 10);
}
async function getLatestBlockNumber(provider) {
    const latestBlockString = (await provider.request({
        method: "eth_blockNumber",
    }));
    const latestBlock = new ethereumjs_util_1.BN((0, ethereumjs_util_1.toBuffer)(latestBlockString));
    return latestBlock.toNumber();
}
//# sourceMappingURL=makeForkClient.js.map