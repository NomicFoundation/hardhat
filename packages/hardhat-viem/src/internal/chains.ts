import type { EthereumProvider } from "hardhat/types";
import type { Chain } from "viem";
import type { TestClientMode } from "../types";

import memoize from "lodash.memoize";

import {
  UnknownDevelopmentNetworkError,
  NetworkNotFoundError,
  MultipleMatchingNetworksError,
} from "./errors";

export async function getChain(provider: EthereumProvider): Promise<Chain> {
  const chains: Record<string, Chain> = require("viem/chains");
  const chainId = await getChainId(provider);

  if (isDevelopmentNetwork(chainId)) {
    if (await isHardhatNetwork(provider)) {
      return chains.hardhat;
    } else if (await isFoundryNetwork(provider)) {
      return chains.foundry;
    } else {
      throw new UnknownDevelopmentNetworkError();
    }
  }

  const matchingChains = Object.values(chains).filter(
    ({ id }) => id === chainId
  );

  if (matchingChains.length === 0) {
    if (await isHardhatNetwork(provider)) {
      return chains.hardhat;
    } else if (await isFoundryNetwork(provider)) {
      return chains.foundry;
    } else {
      throw new NetworkNotFoundError(chainId);
    }
  }

  if (matchingChains.length > 1) {
    throw new MultipleMatchingNetworksError(chainId);
  }

  return matchingChains[0];
}

export function isDevelopmentNetwork(chainId: number) {
  return chainId === 31337;
}

export async function getMode(
  provider: EthereumProvider
): Promise<TestClientMode> {
  if (await isHardhatNetwork(provider)) {
    return "hardhat";
  } else if (await isFoundryNetwork(provider)) {
    return "anvil";
  } else {
    throw new UnknownDevelopmentNetworkError();
  }
}

const getChainId = memoize(async (provider: EthereumProvider) =>
  Number(await provider.send("eth_chainId"))
);

const isHardhatNetwork = memoize(async (provider: EthereumProvider) =>
  detectNetworkByMethodName(provider, NetworkMethod.HARDHAT_METADATA)
);

const isFoundryNetwork = memoize(async (provider: EthereumProvider) =>
  detectNetworkByMethodName(provider, NetworkMethod.ANVIL_NODE_INFO)
);

enum NetworkMethod {
  HARDHAT_METADATA = "hardhat_metadata",
  ANVIL_NODE_INFO = "anvil_nodeInfo",
}

async function detectNetworkByMethodName(
  provider: EthereumProvider,
  methodName: string
) {
  try {
    await provider.send(methodName);
    return true;
  } catch {
    return false;
  }
}
