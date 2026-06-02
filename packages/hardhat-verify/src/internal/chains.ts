import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

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

export function rejectLocalNetworks(chainId: number): void {
  if (chainId===31337) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNSUPPORTED_DEV_NETWORK,
      { chainId },
    );
  }
}
