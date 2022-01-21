import { NomicLabsHardhatPluginError } from "hardhat/plugins";
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
    throwMissingApiKeyError(network);
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
    throwMissingApiKeyError(network);
  }

  return key;
};

function throwMissingApiKeyError(network: string): never {
  throw new NomicLabsHardhatPluginError(
    pluginName,
    `Please provide an Etherscan API token via hardhat config. For example:

{
  ...
  etherscan: {
    apiKey: {
      ${network}: 'your API key'
    }
  }
}

See https://etherscan.io/apis`
  );
}
