import type { PublicClient, TestClient, WalletClient } from "./types.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

export async function getPublicClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  publicClientConfig?: Partial<viemT.PublicClientConfig>,
): Promise<PublicClient> {
  // ...
}

export async function getWalletClients<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<WalletClient[]> {
  // ...
}

export async function getWalletClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  address: string,
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<WalletClient> {
  // ...
}

export async function getTestClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  testClientConfig?: Partial<viemT.TestClientConfig>,
): Promise<TestClient> {
  // ...
}
