"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.etherscanConfigExtender = void 0;
const plugins_1 = require("hardhat/plugins");
const ChainConfig_1 = require("./ChainConfig");
const constants_1 = require("./constants");
const verifyAllowedChains = (etherscanConfig) => {
    if (etherscanConfig.apiKey === null ||
        etherscanConfig.apiKey === undefined ||
        typeof etherscanConfig.apiKey !== "object") {
        return [];
    }
    const allowed = Object.keys(ChainConfig_1.chainConfig);
    const actual = Object.keys(etherscanConfig.apiKey);
    return actual.filter((chain) => !allowed.includes(chain));
};
const etherscanConfigExtender = (resolvedConfig, config) => {
    const defaultConfig = { apiKey: "" };
    if (config.etherscan !== undefined) {
        const customConfig = config.etherscan;
        const unallowedChains = verifyAllowedChains(customConfig);
        if (unallowedChains.length > 0) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Etherscan API token "${unallowedChains[0]}" is for an unsupported network

Learn more at https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers`);
        }
        resolvedConfig.etherscan = Object.assign(Object.assign({}, defaultConfig), customConfig);
    }
    else {
        resolvedConfig.etherscan = defaultConfig;
    }
};
exports.etherscanConfigExtender = etherscanConfigExtender;
//# sourceMappingURL=config.js.map