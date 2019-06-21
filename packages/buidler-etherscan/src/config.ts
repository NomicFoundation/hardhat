import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { EtherscanConfig } from "./types";

export function getDefaultEtherscanConfig(
  config: ResolvedBuidlerConfig
): EtherscanConfig {
  const url = "https://api.etherscan.io/api";
  const apiKey = "";

  return { url, apiKey, ...config.etherscan };
}
