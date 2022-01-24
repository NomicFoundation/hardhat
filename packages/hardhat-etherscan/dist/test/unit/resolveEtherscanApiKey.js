"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const resolveEtherscanApiKey_1 = require("../../src/resolveEtherscanApiKey");
describe("Etherscan API Key resolution", () => {
    describe("provide one api key", () => {
        it("returns the api key no matter the network", () => {
            chai_1.assert.equal((0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: "testtoken" }, "mainnet"), "testtoken");
            chai_1.assert.equal((0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: "testtoken" }, "rinkeby"), "testtoken");
        });
    });
    describe("provide multiple api keys", () => {
        it("can retrieve different keys depending on --network", () => {
            const etherscanConfig = {
                apiKey: {
                    mainnet: "mainnet-testtoken",
                    rinkeby: "rinkeby-testtoken",
                },
            };
            chai_1.assert.equal((0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)(etherscanConfig, "mainnet"), "mainnet-testtoken");
            chai_1.assert.equal((0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)(etherscanConfig, "rinkeby"), "rinkeby-testtoken");
        });
        it("should throw if api key is for unrecognized network", () => {
            chai_1.assert.throws(() => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)(
            // @ts-expect-error
            { apiKey: { newthing: "testtoken" } }, "newthing"));
        });
    });
    describe("provide no api key", () => {
        const expectedBadApiKeyMessage = /Please provide an Etherscan API token via hardhat config/;
        it("should throw if api key root is undefined", () => {
            chai_1.assert.throws(() => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: undefined }, "rinkeby"), expectedBadApiKeyMessage);
        });
        it("should throw if api key root is empty string", () => {
            chai_1.assert.throws(() => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: "" }, "rinkeby"), expectedBadApiKeyMessage);
        });
        it("should throw if network subkey is undefined", () => {
            chai_1.assert.throws(() => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: { rinkeby: undefined } }, "rinkeby"), /Please provide an Etherscan API token via hardhat config./);
        });
        it("should throw if network subkey is empty string", () => {
            chai_1.assert.throws(() => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: { rinkeby: "" } }, "rinkeby"), /Please provide an Etherscan API token via hardhat config./);
        });
        it("should throw if network subkey is not a supported network", () => {
            chai_1.assert.throws(
            // @ts-expect-error
            () => (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)({ apiKey: { boom: "" } }, "boom"), "Unrecognized network: boom");
        });
    });
});
//# sourceMappingURL=resolveEtherscanApiKey.js.map