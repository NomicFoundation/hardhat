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

const DEV_NETWORK_CHAIN_IDS: readonly number[] = [31337, 1337];
export function rejectLocalNetworks(
  networkName: string,
  chainId: number,
): void {
  if (DEV_NETWORK_CHAIN_IDS.includes(chainId)) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
      { networkName, chainId },
    );
  }
}
