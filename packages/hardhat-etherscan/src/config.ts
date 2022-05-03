import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { ConfigExtender } from "hardhat/types";
import { chainConfig } from "./ChainConfig";
import { EtherscanConfig } from "./types";
import { pluginName } from "./constants";

const verifyAllowedChains = (etherscanConfig: EtherscanConfig) => {
  if (
    etherscanConfig.apiKey === null ||
    etherscanConfig.apiKey === undefined ||
    typeof etherscanConfig.apiKey !== "object"
  ) {
    return;
  }

  // check if any of the configured api keys is for an unsupported network
  const builtinChains = Object.keys(chainConfig);
  const customChains = etherscanConfig.customChains.map((x) => x.network);
  const allowedChains = [...builtinChains, ...customChains];

  const actual = Object.keys(etherscanConfig.apiKey);

  const invalidNetwork = actual.find((chain) => !allowedChains.includes(chain));

  if (invalidNetwork !== undefined) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Etherscan API token "${invalidNetwork}" is for an unsupported network

Learn more at https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers`
    );
  }
};

export const etherscanConfigExtender: ConfigExtender = (
  resolvedConfig,
  config
) => {
  const defaultConfig = {
    apiKey: "",
    customChains: [],
  };

  if (config.etherscan !== undefined) {
    const customConfig = config.etherscan;

    resolvedConfig.etherscan = { ...defaultConfig, ...customConfig };

    verifyAllowedChains(resolvedConfig.etherscan);
  } else {
    resolvedConfig.etherscan = defaultConfig;
  }
};
