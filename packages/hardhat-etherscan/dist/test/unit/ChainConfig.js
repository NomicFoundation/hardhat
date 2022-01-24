"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ChainConfig_1 = require("../../src/ChainConfig");
describe("Chain Config", () => {
    it("should have no duplicate chain ids", () => {
        const chainIds = Object.values(ChainConfig_1.chainConfig).map((config) => config.chainId);
        const uniqueIds = [...new Set(chainIds)];
        chai_1.assert.notEqual(0, uniqueIds.length);
        chai_1.assert.equal(uniqueIds.length, chainIds.length);
    });
});
//# sourceMappingURL=ChainConfig.js.map