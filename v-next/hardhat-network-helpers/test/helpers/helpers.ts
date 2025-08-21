import type { EdrNetworkUserConfig } from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { NetworkHelpers } from "../../src/internal/network-helpers/network-helpers.js";

export async function initializeNetwork(
  config: Partial<EdrNetworkUserConfig> = {},
): Promise<{
  provider: EthereumProvider;
  networkHelpers: NetworkHelpers;
}> {
  const hre = await createHardhatRuntimeEnvironment({
    networks: { default: { type: "edr-simulated", ...config } },
  });
  const connection = await hre.network.connect();

  const provider = connection.provider;

  const networkHelpers = new NetworkHelpers(provider, connection.networkName);

  return { provider, networkHelpers };
}

export function rpcQuantityToNumber(quantity: string): number {
  return parseInt(quantity, 16);
}

export async function getBalance(
  provider: EthereumProvider,
  address: string,
): Promise<number> {
  const balance = await provider.request({
    method: "eth_getBalance",
    params: [address],
  });

  assertHardhatInvariant(
    typeof balance === "string",
    "Balance should be a string",
  );

  return rpcQuantityToNumber(balance);
}

export async function getBlockNumber(
  provider: EthereumProvider,
): Promise<number> {
  const blockNumber = await provider.request({
    method: "eth_blockNumber",
  });

  assertHardhatInvariant(
    typeof blockNumber === "string",
    "Block number should be a string",
  );

  return rpcQuantityToNumber(blockNumber);
}
