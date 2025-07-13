import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
} from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";

const chainIdCache = new WeakMap<EthereumProvider, number>();

export async function getChainId(provider: EthereumProvider): Promise<number> {
  const cachedChainId = chainIdCache.get(provider);
  if (cachedChainId !== undefined) {
    return cachedChainId;
  }

  const chainId = Number(await provider.request({ method: "eth_chainId" }));
  chainIdCache.set(provider, chainId);

  return chainId;
}

export async function getChainDescriptor(
  chainId: number,
  chainDescriptors: ChainDescriptorsConfig,
  networkName: string,
): Promise<ChainDescriptorConfig> {
  const chainDescriptor = chainDescriptors.get(toBigInt(chainId));

  if (chainDescriptor === undefined) {
    /*
      // TODO: throw a different error if the network is a development network.
      // See isDevelopmentNetwork in hardhat-viem
      if (networkName === HARDHAT_NETWORK_NAME) {
        throw new HardhatNetworkNotSupportedError();
      }
      */
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
      {
        networkName,
        chainId,
      },
    );
  }

  return chainDescriptor;
}
