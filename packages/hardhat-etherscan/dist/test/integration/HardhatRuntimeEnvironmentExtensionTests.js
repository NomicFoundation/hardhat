"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const helpers_1 = require("../helpers");
describe("hardhat-etherscan configuration extension", function () {
    (0, helpers_1.useEnvironment)("hardhat-project-defined-config", "hardhat");
    it("the etherscan field should be present", function () {
        chai_1.assert.isDefined(this.env.config.etherscan);
    });
    it("the etherscan token should have value from hardhat.env.config.js", function () {
        const { etherscan } = this.env.config;
        chai_1.assert.equal(etherscan.apiKey, "testtoken");
    });
});
describe("hardhat-etherscan configuration defaults in an empty project", function () {
    (0, helpers_1.useEnvironment)("hardhat-project-undefined-config", "hardhat");
    it("the etherscan field should be present", function () {
        chai_1.assert.isDefined(this.env.config.etherscan);
    });
    it("the apiKey subfield should be the empty string", function () {
        chai_1.assert.equal(this.env.config.etherscan.apiKey, "");
    });
});
describe("hardhat-etherscan configuration with multiple api keys", function () {
    (0, helpers_1.useEnvironment)("hardhat-project-multiple-apikeys-config", "hardhat");
    it("the etherscan field should be present", function () {
        chai_1.assert.isDefined(this.env.config.etherscan);
    });
    it("the apiKey subfield should be the apiKeys object", function () {
        chai_1.assert.deepEqual(this.env.config.etherscan.apiKey, {
            mainnet: "mainnet-testtoken",
            ropsten: "ropsten-testtoken",
        });
    });
});
//# sourceMappingURL=HardhatRuntimeEnvironmentExtensionTests.js.map