import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { EtherscanConfig } from "./types";

export function getDefaultEtherscanConfig(
  config: ResolvedBuidlerConfig
): EtherscanConfig {
  const defaultConfig = { apiKey: "" };

  return { ...defaultConfig, ...config.etherscan };
}
