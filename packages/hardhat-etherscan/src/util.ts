import type { CustomChain } from "./types";

import chalk from "chalk";

import { chainConfig } from "./ChainConfig";

export function buildContractUrl(
  browserURL: string,
  contractAddress: string
): string {
  const normalizedBrowserURL = browserURL.trim().replace(/\/$/, "");

  return `${normalizedBrowserURL}/address/${contractAddress}#code`;
}

export async function printSupportedNetworks(customChains: CustomChain[]) {
  const { table } = await import("table");

  // supported networks
  const supportedNetworks = Object.entries(chainConfig)
    .map(([network, config]) => [network, config.chainId] as [string, number])
    // sort by chain id
    .sort((a, b) => a[1] - b[1]);

  const supportedNetworksTable = table([
    [chalk.bold("network"), chalk.bold("chain id")],
    ...supportedNetworks,
  ]);

  // custom networks
  const customNetworks = customChains.map(({ network, chainId }) => [
    network,
    chainId,
  ]);

  const customNetworksTable =
    customNetworks.length > 0
      ? table([
          [chalk.bold("network"), chalk.bold("chain id")],
          ...customNetworks,
        ])
      : table([["No custom networks were added"]]);

  // print message
  console.log(
    `
Networks supported by hardhat-etherscan:

${supportedNetworksTable}

Custom networks added by you or by plugins:

${customNetworksTable}

To learn how to add custom networks, follow these instructions: https://hardhat.org/verify-custom-networks
`.trimStart()
  );
}
