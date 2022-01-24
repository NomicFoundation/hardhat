"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const config_1 = require("../../src/config");
describe("Config extension", () => {
    it("should enforce a default config if none provided", () => {
        const resolvedConfig = {};
        (0, config_1.etherscanConfigExtender)(resolvedConfig, {});
        chai_1.assert.deepStrictEqual(resolvedConfig.etherscan, { apiKey: "" });
    });
    it("copy across a string api key", () => {
        const resolvedConfig = {};
        (0, config_1.etherscanConfigExtender)(resolvedConfig, {
            etherscan: { apiKey: "example_token" },
        });
        chai_1.assert.deepStrictEqual(resolvedConfig.etherscan, {
            apiKey: "example_token",
        });
    });
    it("copy across an etherscan api keys object", () => {
        const resolvedConfig = {};
        (0, config_1.etherscanConfigExtender)(resolvedConfig, {
            etherscan: { apiKey: { ropsten: "example_token" } },
        });
        chai_1.assert.deepStrictEqual(resolvedConfig.etherscan, {
            apiKey: { ropsten: "example_token" },
        });
    });
    it("should error on providing unsupported api key", () => {
        chai_1.assert.throws(() => {
            const resolvedConfig = {};
            const invalidEtherscanConfig = {
                etherscan: {
                    apiKey: {
                        newhotness: "example_token",
                    },
                },
            };
            (0, config_1.etherscanConfigExtender)(resolvedConfig, invalidEtherscanConfig);
        }, 'Etherscan API token "newhotness" is for an unsupported network');
    });
    it("should error on providing multiple unsupported api keys", () => {
        chai_1.assert.throws(() => {
            const resolvedConfig = {};
            const invalidEtherscanConfig = {
                etherscan: {
                    apiKey: {
                        newhotness: "example_token",
                        newhotness2: "example_token",
                    },
                },
            };
            (0, config_1.etherscanConfigExtender)(resolvedConfig, invalidEtherscanConfig);
        }, 'Etherscan API token "newhotness" is for an unsupported network');
    });
});
//# sourceMappingURL=etherscanConfigExtender.js.map