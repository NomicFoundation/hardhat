import type { EthereumProvider } from "hardhat/types";
import type {
  Chain,
  PublicClient,
  PublicClientConfig,
  WalletClient,
  WalletClientConfig,
  TestClient,
  TestClientConfig,
} from "viem";

import { getChain, isDevelopmentNetwork } from "./chains";

export async function getPublicClient(
  provider: EthereumProvider,
  publicClientConfig?: Partial<PublicClientConfig>
): Promise<PublicClient> {
  const chain = publicClientConfig?.chain ?? (await getChain(provider));
  return _getPublicClient(provider, chain, publicClientConfig);
}

export async function _getPublicClient(
  provider: EthereumProvider,
  chain: Chain,
  publicClientConfig?: Partial<PublicClientConfig>
): Promise<PublicClient> {
  const viem = await import("viem");
  const parameters = {
    ...(isDevelopmentNetwork(chain.id) && {
      pollingInterval: 50,
      cacheTime: 0,
    }),
    ...publicClientConfig,
  };

  const publicClient = viem.createPublicClient({
    chain,
    transport: viem.custom(provider),
    ...parameters,
  });

  return publicClient;
}

export async function getWalletClients(
  provider: EthereumProvider,
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  return _getWalletClients(provider, chain, walletClientConfig);
}

export async function _getWalletClients(
  provider: EthereumProvider,
  chain: Chain,
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient> {
  return Promise.resolve({} as WalletClient);
}

export async function getTestClient(
  provider: EthereumProvider,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  const chain = testClientConfig?.chain ?? (await getChain(provider));
  return _getTestClient(provider, chain, testClientConfig);
}

export async function _getTestClient(
  provider: EthereumProvider,
  chain: Chain,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  return Promise.resolve({} as TestClient);
}
