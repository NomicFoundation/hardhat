"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEtherscanApiKey = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("./constants");
const ChainConfig_1 = require("./ChainConfig");
const isNetworkKey = (network) => {
    return network in ChainConfig_1.chainConfig;
};
const resolveEtherscanApiKey = (etherscan, network) => {
    if (etherscan.apiKey === undefined || etherscan.apiKey === "") {
        throwMissingApiKeyError(network);
    }
    if (typeof etherscan.apiKey === "string") {
        return etherscan.apiKey;
    }
    const apiKeys = etherscan.apiKey;
    if (!isNetworkKey(network)) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Unrecognized network: ${network}`);
    }
    const key = apiKeys[network];
    if (key === undefined || key === "") {
        throwMissingApiKeyError(network);
    }
    return key;
};
exports.resolveEtherscanApiKey = resolveEtherscanApiKey;
function throwMissingApiKeyError(network) {
    throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Please provide an Etherscan API token via hardhat config. For example:

{
  ...
  etherscan: {
    apiKey: {
      ${network}: 'your API key'
    }
  }
}

See https://etherscan.io/apis`);
}
//# sourceMappingURL=resolveEtherscanApiKey.js.map