import type { TestClientMode } from "../types.js";
import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
  NetworkConfig,
} from "hardhat/types/config";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";
import type { Chain as ViemChain } from "viem";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { extractChain } from "viem";
import * as chainsModule from "viem/chains";
import { hardhat, anvil, optimism } from "viem/chains";

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
-- TODO: this assertion should not be necessary */
const chains = Object.values(chainsModule) as ViemChain[];

const chainCache = new WeakMap<EthereumProvider, ViemChain>();
const chainIdCache = new WeakMap<EthereumProvider, number>();
const hardhatMetadataCache = new WeakMap<EthereumProvider, HardhatMetadata>();
const isAnvilNetworkCache = new WeakMap<EthereumProvider, boolean>();

// Caches for custom chain support
const chainDescriptorsCache = new WeakMap<
  EthereumProvider,
  ChainDescriptorsConfig
>();
const networkContextCache = new WeakMap<
  EthereumProvider,
  {
    networkName: string;
    networkConfig: Readonly<NetworkConfig>;
    resolvedUrl: string | undefined;
  }
>();

/**
 * Sets the chain context for a provider, enabling custom chain resolution.
 * Must be called before getChain() for custom chains to work.
 */
export async function setChainContext(
  provider: EthereumProvider,
  chainDescriptors: ChainDescriptorsConfig,
  networkName: string,
  networkConfig: Readonly<NetworkConfig>,
): Promise<void> {
  chainDescriptorsCache.set(provider, chainDescriptors);

  // Pre-resolve the URL for HTTP networks
  const resolvedUrl =
    networkConfig.type === "http"
      ? await networkConfig.url.getUrl()
      : undefined;

  networkContextCache.set(provider, {
    networkName,
    networkConfig,
    resolvedUrl,
  });
}

const HARDHAT_METADATA_METHOD = "hardhat_metadata";
const ANVIL_NODE_INFO_METHOD = "anvil_nodeInfo";

export async function getChain<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
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
      chain = createHardhatChain(provider, chainId, chainType);
    } else if (await isAnvilNetwork(provider)) {
      chain = {
        ...anvil,
        id: chainId,
      };
    } else if (chain === undefined) {
      // Try 1: Create chain from user's chainDescriptors config
      const chainDescriptors = chainDescriptorsCache.get(provider);
      const descriptor = chainDescriptors?.get(BigInt(chainId));

      if (descriptor !== undefined) {
        chain = createChainFromDescriptor(
          chainId,
          chainType,
          provider,
          descriptor,
        );
      } else {
        // Try 2: Fallback to network config if chainId matches
        const networkChain = createChainFromNetworkConfig(
          chainId,
          chainType,
          provider,
        );

        if (networkChain === undefined) {
          // Neither chainDescriptor nor matching network config found
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.NETWORK_NOT_FOUND,
            { chainId },
          );
        }
        chain = networkChain;
      }
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
  const cachedHardhatMetadata = hardhatMetadataCache.get(provider);
  if (cachedHardhatMetadata !== undefined) {
    return true;
  }

  try {
    const hardhatMetadata = await provider.request({
      method: HARDHAT_METADATA_METHOD,
    });

    assertHardhatInvariant(
      isHardhatMetadata(hardhatMetadata),
      "Expected valid hardhat metadata response",
    );

    hardhatMetadataCache.set(provider, hardhatMetadata);
    return true;
  } catch {
    hardhatMetadataCache.delete(provider);
    return false;
  }
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

/**
 * Create a viem chain from an explicit chainDescriptor.
 */
function createChainFromDescriptor(
  chainId: number,
  chainType: ChainType | string,
  provider: EthereumProvider,
  descriptor: ChainDescriptorConfig,
): ViemChain {
  const networkContext = networkContextCache.get(provider);
  const rpcUrl = networkContext?.resolvedUrl;

  const chain: ViemChain = {
    id: chainId,
    name: descriptor.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: rpcUrl !== undefined ? [rpcUrl] : [] },
    },
  };

  // Add block explorers - check both etherscan and blockscout, prefer etherscan
  const etherscan = descriptor.blockExplorers.etherscan;
  const blockscout = descriptor.blockExplorers.blockscout;

  if (etherscan?.url !== undefined) {
    chain.blockExplorers = {
      default: {
        name: etherscan.name ?? "Etherscan",
        url: etherscan.url,
      },
    };
  } else if (blockscout?.url !== undefined) {
    chain.blockExplorers = {
      default: {
        name: blockscout.name ?? "Blockscout",
        url: blockscout.url,
      },
    };
  }

  // Add OP contracts for L2 chains
  if (chainType === "op" || descriptor.chainType === "op") {
    chain.contracts = { ...optimism.contracts };
  }

  return chain;
}

/**
 * Create a viem chain from the network config as a fallback
 * when no chainDescriptor is defined.
 */
function createChainFromNetworkConfig(
  chainId: number,
  chainType: ChainType | string,
  provider: EthereumProvider,
): ViemChain | undefined {
  const networkContext = networkContextCache.get(provider);
  if (networkContext === undefined) {
    return undefined;
  }

  const { networkName, networkConfig, resolvedUrl } = networkContext;

  // Only use as fallback if network's chainId matches
  if (networkConfig.chainId !== chainId) {
    return undefined;
  }

  const chain: ViemChain = {
    id: chainId,
    name: networkName,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: resolvedUrl !== undefined ? [resolvedUrl] : [] },
    },
  };

  // Add OP contracts if network or passed chainType is "op"
  if (chainType === "op" || networkConfig.chainType === "op") {
    chain.contracts = { ...optimism.contracts };
  }

  return chain;
}

function createHardhatChain<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainId: number,
  chainType: ChainTypeT,
): ViemChain {
  const hardhatMetadata = hardhatMetadataCache.get(provider);
  assertHardhatInvariant(
    hardhatMetadata !== undefined,
    "Expected hardhat metadata to be available",
  );

  if (hardhatMetadata.forkedNetwork?.chainId !== undefined) {
    const forkedChain = extractChain({
      chains,
      id: hardhatMetadata.forkedNetwork.chainId,
    });

    if (forkedChain !== undefined) {
      return {
        ...forkedChain,
        ...hardhat,
        id: chainId,
      };
    }
  }

  const chain: ViemChain = {
    ...hardhat,
    id: chainId,
  };

  if (chainType === "op") {
    // we add the optimism contracts to enable viem's L2 actions
    chain.contracts = {
      ...optimism.contracts,
    };
  }

  return chain;
}

interface HardhatMetadata {
  forkedNetwork?: {
    chainId: number;
  };
}

function isHardhatMetadata(value: unknown): value is HardhatMetadata {
  return (
    isObject(value) &&
    (value.forkedNetwork === undefined ||
      (isObject(value.forkedNetwork) &&
        typeof value.forkedNetwork.chainId === "number"))
  );
}
