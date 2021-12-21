import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { ConfigExtender } from "hardhat/types";
import { chainConfig } from "./ChainConfig";
import { EtherscanConfig } from "./types";
import { pluginName } from "./constants";

const verifyAllowedChains = (etherscanConfig: EtherscanConfig): string[] => {
  if (
    etherscanConfig.apiKey === null ||
    etherscanConfig.apiKey === undefined ||
    typeof etherscanConfig.apiKey !== "object"
  ) {
    return [];
  }

  const allowed = Object.keys(chainConfig);
  const actual = Object.keys(etherscanConfig.apiKey);

  return actual.filter((chain: string) => !allowed.includes(chain));
};

export const etherscanConfigExtender: ConfigExtender = (
  resolvedConfig,
  config
) => {
  const defaultConfig = { apiKey: "" };

  if (config.etherscan !== undefined) {
    const customConfig = config.etherscan;

    const unallowedChains = verifyAllowedChains(customConfig);

    if (unallowedChains.length > 0) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `Etherscan API token "${unallowedChains[0]}" is for an unsupported network

Learn more at https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers`
      );
    }

    resolvedConfig.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    resolvedConfig.etherscan = defaultConfig;
  }
};
