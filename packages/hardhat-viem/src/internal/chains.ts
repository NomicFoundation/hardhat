import type { EthereumProvider } from "hardhat/types";
import type { Chain } from "viem";
import type { TestClientMode } from "../types";

import memoize from "lodash.memoize";

import { UnknownDevelopmentNetworkError, NetworkNotFoundError } from "./errors";

export async function getChain(provider: EthereumProvider): Promise<Chain> {
  const { extractChain } = await import("viem");
  const chainsModule = await import("viem/chains");
  const chains = Object.values(chainsModule) as Chain[];
  const chainId = await getChainId(provider);

  if (isDevelopmentNetwork(chainId)) {
    if (await isHardhatNetwork(provider)) {
      return chainsModule.hardhat;
    } else if (await isFoundryNetwork(provider)) {
      return chainsModule.foundry;
    } else {
      throw new UnknownDevelopmentNetworkError();
    }
  }

  const chain = extractChain({
    chains,
    id: chainId,
  });

  if (chain === undefined) {
    if (await isHardhatNetwork(provider)) {
      return {
        ...chainsModule.hardhat,
        id: chainId,
      };
    } else if (await isFoundryNetwork(provider)) {
      return {
        ...chainsModule.foundry,
        id: chainId,
      };
    } else {
      throw new NetworkNotFoundError(chainId);
    }
  }

  return chain;
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
