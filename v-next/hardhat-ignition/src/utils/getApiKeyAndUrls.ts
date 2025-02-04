import type { ChainConfig } from "@nomicfoundation/hardhat-verify/types";

import { NomicLabsHardhatPluginError } from "@ignored/hardhat-vnext/plugins";

export function getApiKeyAndUrls(
  etherscanApiKey: string | Record<string, string>,
  chainConfig: ChainConfig
): [apiKey: string, apiUrl: string, webUrl: string] {
  const apiKey: string =
    typeof etherscanApiKey === "string"
      ? etherscanApiKey
      : etherscanApiKey[chainConfig.network];

  if (apiKey === undefined) {
    throw new NomicLabsHardhatPluginError(
      "@nomicfoundation/hardhat-ignition",
      `No etherscan API key configured for network ${chainConfig.network}`
    );
  }

  return [apiKey, chainConfig.urls.apiURL, chainConfig.urls.browserURL];
}
