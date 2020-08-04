import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { EtherscanConfig } from "./types";

// TODO: This function doesn't guarantee an EtherscanConfig object.
// Some of our users don't use TypeScript and instead use plain JavaScript.
// This means that the config.etherscan field could actually be anything.
export function getDefaultEtherscanConfig(
  config: ResolvedBuidlerConfig
): EtherscanConfig {
  const defaultConfig = { apiKey: "" };

  return { ...defaultConfig, ...config.etherscan };
}
