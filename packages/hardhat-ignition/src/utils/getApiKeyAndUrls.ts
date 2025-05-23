import type { ChainConfig } from "@nomicfoundation/hardhat-verify/types";

import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export function getApiKeyAndUrls(
  etherscanApiKey: string | Record<string, string>,
  chainConfig: ChainConfig
): [
  apiKey: string,
  apiUrl: string,
  webUrl: string,
  chainId: number | undefined
] {
  const apiKey: string =
    typeof etherscanApiKey === "string"
      ? etherscanApiKey
      : etherscanApiKey[chainConfig.network];

  const chainId =
    typeof etherscanApiKey === "string" ? chainConfig.chainId : undefined;

  if (apiKey === undefined) {
    throw new NomicLabsHardhatPluginError(
      "@nomicfoundation/hardhat-ignition",
      `No etherscan API key configured for network ${chainConfig.network}`
    );
  }

  return [
    apiKey,
    chainConfig.urls.apiURL,
    chainConfig.urls.browserURL,
    chainId,
  ];
}
