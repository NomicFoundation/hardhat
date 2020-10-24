import { ConfigExtender } from "hardhat/types";

export const defaultEtherscanConfig: ConfigExtender = (
  resolvedConfig,
  config
) => {
  const defaultConfig = { apiKey: "" };

  if (config.etherscan !== undefined) {
    const customConfig = config.etherscan;
    resolvedConfig.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    resolvedConfig.etherscan = defaultConfig;
  }
};
