"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicMatched = exports.includes = exports.filterLogs = exports.bloomFilter = exports.Type = exports.LATEST_BLOCK = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
exports.LATEST_BLOCK = new ethereumjs_util_1.BN(-1);
var Type;
(function (Type) {
    Type[Type["LOGS_SUBSCRIPTION"] = 0] = "LOGS_SUBSCRIPTION";
    Type[Type["PENDING_TRANSACTION_SUBSCRIPTION"] = 1] = "PENDING_TRANSACTION_SUBSCRIPTION";
    Type[Type["BLOCK_SUBSCRIPTION"] = 2] = "BLOCK_SUBSCRIPTION";
})(Type = exports.Type || (exports.Type = {}));
function bloomFilter(bloom, addresses, normalizedTopics) {
    if (addresses.length > 0) {
        let included = false;
        for (const address of addresses) {
            if (bloom.check(address)) {
                included = true;
                break;
            }
        }
        if (!included) {
            return false;
        }
    }
    for (const sub of normalizedTopics) {
        if (sub === null || sub.length === 0) {
            continue;
        }
        let included = false;
        for (const topic of sub) {
            if (topic !== null && bloom.check(topic)) {
                included = true;
                break;
            }
        }
        if (!included) {
            return false;
        }
    }
    return true;
}
exports.bloomFilter = bloomFilter;
function filterLogs(logs, criteria) {
    const filteredLogs = [];
    for (const log of logs) {
        const blockNumber = new ethereumjs_util_1.BN((0, ethereumjs_util_1.toBuffer)(log.blockNumber));
        if (blockNumber.lt(criteria.fromBlock)) {
            continue;
        }
        if (!criteria.toBlock.eq(exports.LATEST_BLOCK) &&
            blockNumber.gt(criteria.toBlock)) {
            continue;
        }
        if (criteria.addresses.length !== 0 &&
            !includes(criteria.addresses, (0, ethereumjs_util_1.toBuffer)(log.address))) {
            continue;
        }
        if (!topicMatched(criteria.normalizedTopics, log.topics)) {
            continue;
        }
        filteredLogs.push(log);
    }
    return filteredLogs;
}
exports.filterLogs = filterLogs;
function includes(addresses, a) {
    for (const address of addresses) {
        if (Buffer.compare(address, a) === 0) {
            return true;
        }
    }
    return false;
}
exports.includes = includes;
function topicMatched(normalizedTopics, logTopics) {
    for (let i = 0; i < normalizedTopics.length; i++) {
        if (normalizedTopics.length > logTopics.length) {
            return false;
        }
        const sub = normalizedTopics[i];
        if (sub === null || sub.length === 0) {
            continue;
        }
        let match = false;
        for (const topic of sub) {
            if (topic === null || logTopics[i] === (0, ethereumjs_util_1.bufferToHex)(topic)) {
                match = true;
                break;
            }
        }
        if (!match) {
            return false;
        }
    }
    return true;
}
exports.topicMatched = topicMatched;
//# sourceMappingURL=filter.js.map