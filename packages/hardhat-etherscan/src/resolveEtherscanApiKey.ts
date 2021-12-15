import { NomicLabsHardhatPluginError } from "hardhat/src/plugins";
import { pluginName } from "./constants";
import { chainConfig } from "./ChainConfig";
import { EtherscanConfig, ChainConfig } from "./types";

const isNetworkKey = (network: string): network is keyof ChainConfig => {
  return network in chainConfig;
};

export const resolveEtherscanApiKey = (
  etherscan: EtherscanConfig,
  network: string
): string => {
  if (etherscan.apiKey === undefined || etherscan.apiKey === "") {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Please provide an Etherscan API token via hardhat config.
  E.g.: { [...], etherscan: { apiKey: 'an API key' }, [...] }
  or { [...], etherscan: { apiKey: { mainnet: 'an API key' } }, [...] }
  See https://etherscan.io/apis`
    );
  }

  if (typeof etherscan.apiKey === "string") {
    return etherscan.apiKey;
  }

  const apiKeys = etherscan.apiKey;

  if (!isNetworkKey(network)) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Unrecognized network: ${network}`
    );
  }

  const key = apiKeys[network];

  if (key === undefined || key === "") {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Please provide a Block Explorer API token via hardhat config.
  E.g.: { [...], etherscan: { apiKey: { ${network}: 'an API key' } }, [...] }`
    );
  }

  return key;
};
