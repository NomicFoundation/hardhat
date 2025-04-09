import type { TestClientMode } from "../types.js";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";
import type { Chain as ViemChain } from "viem";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { extractChain } from "viem";
import * as chainsModule from "viem/chains";
import { hardhat, anvil, optimism } from "viem/chains";

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
-- TODO: this assertion should not be necessary */
const chains = Object.values(chainsModule) as ViemChain[];

const chainCache = new WeakMap<EthereumProvider, ViemChain>();
const chainIdCache = new WeakMap<EthereumProvider, number>();
const isHardhatNetworkCache = new WeakMap<EthereumProvider, boolean>();
const isAnvilNetworkCache = new WeakMap<EthereumProvider, boolean>();

const HARDHAT_METADATA_METHOD = "hardhat_metadata";
const ANVIL_NODE_INFO_METHOD = "anvil_nodeInfo";

export async function getChain(
  provider: EthereumProvider,
  chainType: ChainType | string,
): Promise<ViemChain> {
  const cachedChain = chainCache.get(provider);
  if (cachedChain !== undefined) {
    return cachedChain;
  }

  const chainId = await getChainId(provider);

  let chain = extractChain({
    chains,
    id: chainId,
  });

  if ((await isDevelopmentNetwork(provider)) || chain === undefined) {
    if (await isHardhatNetwork(provider)) {
      // TODO: We shoud improve how we handle the chains for the different chain
      // types, as this is both a hardhat and an optimism chain.
      //
      // We are currently creating our chain based off optimism's, but that's
      // not always the correct behavior, as the user may be connecting to
      // a different chain.
      if (chainType === "optimism") {
        chain = { ...optimism, id: chainId };
      } else {
        chain = {
          ...hardhat,
          id: chainId,
        };
      }
    } else if (await isAnvilNetwork(provider)) {
      chain = {
        ...anvil,
        id: chainId,
      };
    } else if (chain === undefined) {
      // If the chain couldn't be found and we can't detect the development
      // network we throw an error.
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.NETWORK_NOT_FOUND,
        {
          chainId,
        },
      );
    } else {
      assertHardhatInvariant(
        false,
        "This should not happen, as we check in isDevelopmentNetwork that it's either hardhat or anvil",
      );
    }
  }

  chainCache.set(provider, chain);

  return chain;
}

export async function getChainId(provider: EthereumProvider): Promise<number> {
  const cachedChainId = chainIdCache.get(provider);
  if (cachedChainId !== undefined) {
    return cachedChainId;
  }

  const chainId = Number(await provider.request({ method: "eth_chainId" }));
  chainIdCache.set(provider, chainId);

  return chainId;
}

export async function isDevelopmentNetwork(
  provider: EthereumProvider,
): Promise<boolean> {
  if (await isHardhatNetwork(provider)) {
    return true;
  }

  if (await isAnvilNetwork(provider)) {
    return true;
  }

  return false;
}

export async function isHardhatNetwork(
  provider: EthereumProvider,
): Promise<boolean> {
  const cachedIsHardhat = isHardhatNetworkCache.get(provider);
  if (cachedIsHardhat !== undefined) {
    return cachedIsHardhat;
  }

  const isHardhat = await isMethodSupported(provider, HARDHAT_METADATA_METHOD);
  isHardhatNetworkCache.set(provider, isHardhat);

  return isHardhat;
}

export async function isAnvilNetwork(
  provider: EthereumProvider,
): Promise<boolean> {
  const cachedIsAnvil = isAnvilNetworkCache.get(provider);
  if (cachedIsAnvil !== undefined) {
    return cachedIsAnvil;
  }

  const isAnvil = await isMethodSupported(provider, ANVIL_NODE_INFO_METHOD);
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
    HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.UNSUPPORTED_DEVELOPMENT_NETWORK,
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
