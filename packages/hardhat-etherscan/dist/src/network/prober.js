"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveContractBytecode = exports.getEtherscanEndpoints = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("../constants");
async function getEtherscanEndpoints(provider, networkName, chainConfig) {
    if (networkName === plugins_1.HARDHAT_NETWORK_NAME) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The selected network is ${networkName}. Please select a network supported by Etherscan.`);
    }
    const chainIdsToNames = new Map(entries(chainConfig).map(([chainName, config]) => [
        config.chainId,
        chainName,
    ]));
    const chainID = parseInt(await provider.send("eth_chainId"), 16);
    const network = chainIdsToNames.get(chainID);
    if (network === undefined) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Unsupported network ("${networkName}", chainId: ${chainID}).`);
    }
    const chainConfigEntry = chainConfig[network];
    return { network, urls: chainConfigEntry.urls };
}
exports.getEtherscanEndpoints = getEtherscanEndpoints;
async function retrieveContractBytecode(address, provider, networkName) {
    const bytecodeString = (await provider.send("eth_getCode", [
        address,
        "latest",
    ]));
    const deployedBytecode = bytecodeString.startsWith("0x")
        ? bytecodeString.slice(2)
        : bytecodeString;
    if (deployedBytecode.length === 0) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The address ${address} has no bytecode. Is the contract deployed to this network?
The selected network is ${networkName}.`);
    }
    return deployedBytecode;
}
exports.retrieveContractBytecode = retrieveContractBytecode;
function entries(o) {
    return Object.entries(o);
}
//# sourceMappingURL=prober.js.map