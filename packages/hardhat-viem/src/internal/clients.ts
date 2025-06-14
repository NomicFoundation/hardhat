import type { EthereumProvider, Network } from "hardhat/types";
import type {
  Address,
  Chain,
  PublicClientConfig,
  WalletClientConfig,
  TestClientConfig,
} from "viem";
import type {
  PublicClient,
  TestClient,
  TestClientMode,
  WalletClient,
} from "../types";

async function getParameters<TConfig extends {} | undefined>(
  chain: Chain,
  config: TConfig
) {
  const { isDevelopmentNetwork } = await import("./chains");

  const defaultParameters = isDevelopmentNetwork(chain.id)
    ? { pollingInterval: 50, cacheTime: 0 }
    : {};

  const transportParameters = isDevelopmentNetwork(chain.id)
    ? { retryCount: 0 }
    : {};

  return {
    clientParameters: { ...defaultParameters, ...config },
    transportParameters,
  };
}

/**
 * Get a PublicClient instance. This is a read-only client that can be used to
 * query the blockchain.
 *
 * @param provider The Ethereum provider used to connect to the blockchain.
 * @param publicClientConfig Optional configuration for the PublicClient instance. See the viem documentation for more information.
 * @returns A PublicClient instance.
 */
export async function getPublicClient(
  hardhatNetwork: Network,
  publicClientConfig?: Partial<PublicClientConfig>
): Promise<PublicClient> {
  const { getChain } = await import("./chains");
  const chain = publicClientConfig?.chain ?? (await getChain(hardhatNetwork));
  return innerGetPublicClient(hardhatNetwork.provider, chain, publicClientConfig);
}

export async function innerGetPublicClient(
  provider: EthereumProvider,
  chain: Chain,
  publicClientConfig?: Partial<PublicClientConfig>
): Promise<PublicClient> {
  const viem = await import("viem");
  const { clientParameters, transportParameters } = await getParameters(
    chain,
    publicClientConfig
  );

  const publicClient = viem.createPublicClient({
    chain,
    transport: viem.custom(provider, transportParameters),
    ...clientParameters,
  });

  return publicClient;
}

/**
 * Get a list of WalletClient instances. These are read-write clients that can
 * be used to send transactions to the blockchain. Each client is associated
 * with an account obtained from the provider using `eth_accounts`.
 *
 * @param provider The Ethereum provider used to connect to the blockchain.
 * @param walletClientConfig Optional configuration for the WalletClient instances. See the viem documentation for more information.
 * @returns A list of WalletClient instances.
 */
export async function getWalletClients(
  network: Network,
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient[]> {
  const { getAccounts } = await import("./accounts");
  const { getChain } = await import("./chains");
  const provider = network.provider;
  const chain = walletClientConfig?.chain ?? (await getChain(network));
  const accounts = await getAccounts(provider);
  return innerGetWalletClients(provider, chain, accounts, walletClientConfig);
}

export async function innerGetWalletClients(
  provider: EthereumProvider,
  chain: Chain,
  accounts: Address[],
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient[]> {
  const viem = await import("viem");
  const { clientParameters, transportParameters } = await getParameters(
    chain,
    walletClientConfig
  );

  const walletClients = accounts.map((account) =>
    viem.createWalletClient({
      chain,
      account,
      transport: viem.custom(provider, transportParameters),
      ...clientParameters,
    })
  );

  return walletClients;
}

/**
 * Get a WalletClient instance for a specific address. This is a read-write
 * client that can be used to send transactions to the blockchain.
 *
 * @param provider The Ethereum provider used to connect to the blockchain.
 * @param address The public address of the account to use.
 * @param walletClientConfig Optional configuration for the WalletClient instance. See the viem documentation for more information.
 * @returns A WalletClient instance.
 */
export async function getWalletClient(
  network: Network,
  address: Address,
  walletClientConfig?: Partial<WalletClientConfig>
): Promise<WalletClient> {
  const { getChain } = await import("./chains");
  const provider = network.provider;
  const chain = walletClientConfig?.chain ?? (await getChain(network));
  return (
    await innerGetWalletClients(provider, chain, [address], walletClientConfig)
  )[0];
}

/**
 * Get a TestClient instance. This is a read-write client that can be used to
 * perform actions only available on test nodes such as hardhat or anvil.
 *
 * @param provider The Ethereum provider used to connect to the blockchain.
 * @param testClientConfig Optional configuration for the TestClient instance. See the viem documentation for more information.
 * @returns A TestClient instance.
 */
export async function getTestClient(
  network: Network,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  const { getChain, getMode } = await import("./chains");
  const provider = network.provider;
  const chain = testClientConfig?.chain ?? (await getChain(network));
  const mode = await getMode(provider);
  return innerGetTestClient(provider, chain, mode, testClientConfig);
}

export async function innerGetTestClient(
  provider: EthereumProvider,
  chain: Chain,
  mode: TestClientMode,
  testClientConfig?: Partial<TestClientConfig>
): Promise<TestClient> {
  const viem = await import("viem");
  const { clientParameters, transportParameters } = await getParameters(
    chain,
    testClientConfig
  );

  const testClient = viem.createTestClient({
    mode,
    chain,
    transport: viem.custom(provider, transportParameters),
    ...clientParameters,
  });

  return testClient;
}
