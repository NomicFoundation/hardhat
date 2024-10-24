import type { TestClientMode } from "./types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { extractChain } from "viem";
import * as chainsModule from "viem/chains";
import { hardhat, anvil } from "viem/chains";

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
-- TODO: this assertion should not be necessary */
const chains = Object.values(chainsModule) as viemT.Chain[];

export async function getChain(
  provider: EthereumProvider,
): Promise<viemT.Chain> {
  const chainId = await getChainId(provider);

  const chain = extractChain({
    chains,
    id: chainId,
  });

  if (isDevelopmentNetwork(chainId) || chain === undefined) {
    if (await isHardhatNetwork(provider)) {
      return {
        ...hardhat,
        id: chainId,
      };
    }

    if (await isAnvilNetwork(provider)) {
      return {
        ...anvil,
        id: chainId,
      };
    }

    // If the chain couldn't be found and we can't detect the development
    // network we throw an error
    if (chain === undefined) {
      throw new HardhatError(HardhatError.ERRORS.VIEM.NETWORK_NOT_FOUND, {
        chainId,
      });
    }

    // If the chain is a development network but not one of our supported
    // development networks (e.g. Hardhat, Anvil) then throw
    throw new HardhatError(
      HardhatError.ERRORS.VIEM.UNSUPPORTED_DEVELOPMENT_NETWORK,
    );
  }

  return chain;
}

const chainIdCache = new Map<EthereumProvider, number>();

export async function getChainId(provider: EthereumProvider): Promise<number> {
  const cachedChainId = chainIdCache.get(provider);
  if (cachedChainId !== undefined) {
    return cachedChainId;
  }

  const chainId = Number(await provider.request({ method: "eth_chainId" }));
  chainIdCache.set(provider, chainId);

  return chainId;
}

export function isDevelopmentNetwork(chainId: number): boolean {
  return chainId === 31337;
}

enum NetworkMethod {
  HARDHAT_METADATA = "hardhat_metadata",
  ANVIL_NODE_INFO = "anvil_nodeInfo",
}

const isHardhatNetworkCache = new Map<EthereumProvider, boolean>();

export async function isHardhatNetwork(
  provider: EthereumProvider,
): Promise<boolean> {
  const cachedIsHardhat = isHardhatNetworkCache.get(provider);
  if (cachedIsHardhat !== undefined) {
    return cachedIsHardhat;
  }

  const isHardhat = await isMethodSupported(
    provider,
    NetworkMethod.HARDHAT_METADATA,
  );
  isHardhatNetworkCache.set(provider, isHardhat);

  return isHardhat;
}

const isAnvilNetworkCache = new Map<EthereumProvider, boolean>();

export async function isAnvilNetwork(
  provider: EthereumProvider,
): Promise<boolean> {
  const cachedIsAnvil = isAnvilNetworkCache.get(provider);
  if (cachedIsAnvil !== undefined) {
    return cachedIsAnvil;
  }

  const isAnvil = await isMethodSupported(
    provider,
    NetworkMethod.ANVIL_NODE_INFO,
  );
  isAnvilNetworkCache.set(provider, isAnvil);

  return isAnvil;
}

export async function getMode(
  provider: EthereumProvider,
): Promise<TestClientMode> {
  if (await isHardhatNetwork(provider)) {
    return "hardhat";
  }
  if (await isAnvilNetwork(provider)) {
    return "anvil";
  }
  throw new HardhatError(
    HardhatError.ERRORS.VIEM.UNSUPPORTED_DEVELOPMENT_NETWORK,
  );
}

async function isMethodSupported(provider: EthereumProvider, method: string) {
  try {
    await provider.request({ method });
    return true;
  } catch {
    return false;
  }
}
