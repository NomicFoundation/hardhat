import type { EthereumProvider } from "hardhat/types";
import type {
  Address,
  Chain,
  PublicClient,
  PublicClientConfig,
  WalletClient,
  WalletClientConfig,
  TestClient,
  TestClientConfig,
} from "viem";
import type { TestClientMode } from "viem/src/clients/createTestClient";

import { getChain, getMode, isDevelopmentNetwork } from "./chains";
import { getAccounts } from "./accounts";

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
): Promise<WalletClient[]> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const accounts = await getAccounts(provider);
  return _getWalletClients(provider, chain, accounts, walletClientConfig);
}

export async function _getWalletClients(
  provider: EthereumProvider,
  chain: Chain,
  accounts: Address[],
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient[]> {
  const viem = await import("viem");
  const parameters = {
    ...(isDevelopmentNetwork(chain.id) && {
      pollingInterval: 50,
      cacheTime: 0,
    }),
    ...walletClientConfig,
  };

  const walletClients = accounts.map((account) =>
    viem.createWalletClient({
      chain,
      account,
      transport: viem.custom(provider),
      ...parameters,
    })
  );
  return walletClients;
}

export async function getWalletClient(
  provider: EthereumProvider,
  address: Address,
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  return (
    await _getWalletClients(provider, chain, [address], walletClientConfig)
  )[0];
}

export async function getTestClient(
  provider: EthereumProvider,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  const chain = testClientConfig?.chain ?? (await getChain(provider));
  const mode = await getMode(provider);
  return _getTestClient(provider, chain, mode, testClientConfig);
}

export async function _getTestClient(
  provider: EthereumProvider,
  chain: Chain,
  mode: TestClientMode,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  const viem = await import("viem");
  const parameters = {
    pollingInterval: 50,
    cacheTime: 0,
    ...testClientConfig,
  };

  const testClient = viem.createTestClient({
    mode,
    chain,
    transport: viem.custom(provider),
    ...parameters,
  });

  return testClient;
}
