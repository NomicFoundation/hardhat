"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const util_1 = require("../../src/util");
describe("utils", function () {
    describe("buildContractUrl", () => {
        it("should work for URLs without paths and no trailing slash", function () {
            const contractUrl = (0, util_1.buildContractUrl)("https://example.com", "0x123");
            chai_1.assert.equal(contractUrl, "https://example.com/address/0x123#code");
        });
        it("should work for URLs without paths and a trailing slash", function () {
            const contractUrl = (0, util_1.buildContractUrl)("https://example.com/", "0x123");
            chai_1.assert.equal(contractUrl, "https://example.com/address/0x123#code");
        });
        it("should work for URLs with paths and no trailing slash", function () {
            const contractUrl = (0, util_1.buildContractUrl)("https://example.com/chain/1", "0x123");
            chai_1.assert.equal(contractUrl, "https://example.com/chain/1/address/0x123#code");
        });
        it("should work for URLs with paths and a trailing slash", function () {
            const contractUrl = (0, util_1.buildContractUrl)("https://example.com/chain/1/", "0x123");
            chai_1.assert.equal(contractUrl, "https://example.com/chain/1/address/0x123#code");
        });
    });
});
//# sourceMappingURL=util.js.map