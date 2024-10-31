import type {
  GetPublicClientReturnType,
  GetWalletClientReturnType,
  TestClient,
} from "../types.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type {
  Address as ViemAddress,
  PublicClientConfig as ViemPublicClientConfig,
  TestClientConfig as ViemTestClientConfig,
  WalletClientConfig as ViemWalletClientConfig,
} from "viem";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  custom as customTransport,
} from "viem";
import { publicActionsL2, walletActionsL2 } from "viem/op-stack";

import { getAccounts } from "./accounts.js";
import { getChain, getMode, isDevelopmentNetwork } from "./chains.js";

export async function getPublicClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  publicClientConfig?: Partial<ViemPublicClientConfig>,
): Promise<GetPublicClientReturnType<ChainTypeT>> {
  const chain =
    publicClientConfig?.chain ?? (await getChain(provider, chainType));
  const parameters = {
    ...(await getDefaultClientParameters(provider)),
    ...publicClientConfig,
  };

  let publicClient = createPublicClient({
    chain,
    transport: customTransport(provider),
    ...parameters,
  });

  if (chainType === "optimism") {
    publicClient = publicClient.extend(publicActionsL2());
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We need to assert the type because TS gets confused with the conditional type */
  return publicClient as GetPublicClientReturnType<ChainTypeT>;
}

export async function getWalletClients<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  walletClientConfig?: Partial<ViemWalletClientConfig>,
): Promise<Array<GetWalletClientReturnType<ChainTypeT>>> {
  const chain =
    walletClientConfig?.chain ?? (await getChain(provider, chainType));
  const accounts = await getAccounts(provider);
  const parameters = {
    ...(await getDefaultClientParameters(provider)),
    ...walletClientConfig,
  };

  let walletClients = accounts.map((account) =>
    createWalletClient({
      chain,
      account,
      transport: customTransport(provider),
      ...parameters,
    }),
  );

  if (chainType === "optimism") {
    walletClients = walletClients.map((walletClient) =>
      walletClient.extend(walletActionsL2()),
    );
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We need to assert the type because TS gets confused with the conditional type */
  return walletClients as Array<GetWalletClientReturnType<ChainTypeT>>;
}

export async function getWalletClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  address: ViemAddress,
  walletClientConfig?: Partial<ViemWalletClientConfig>,
): Promise<GetWalletClientReturnType<ChainTypeT>> {
  const chain =
    walletClientConfig?.chain ?? (await getChain(provider, chainType));
  const parameters = {
    ...(await getDefaultClientParameters(provider)),
    ...walletClientConfig,
  };

  let walletClient = createWalletClient({
    chain,
    account: address,
    transport: customTransport(provider),
    ...parameters,
  });

  if (chainType === "optimism") {
    walletClient = walletClient.extend(walletActionsL2());
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We need to assert the type because TS gets confused with the conditional type */
  return walletClient as GetWalletClientReturnType<ChainTypeT>;
}

export async function getDefaultWalletClient<
  ChainTypeT extends ChainType | string,
>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  walletClientConfig?: Partial<ViemWalletClientConfig>,
): Promise<GetWalletClientReturnType<ChainTypeT>> {
  const chain =
    walletClientConfig?.chain ?? (await getChain(provider, chainType));
  const [defaultAccount] = await getAccounts(provider);

  if (defaultAccount === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.VIEM.DEFAULT_WALLET_CLIENT_NOT_FOUND,
      {
        chainId: chain.id,
      },
    );
  }

  return getWalletClient(
    provider,
    chainType,
    defaultAccount,
    walletClientConfig,
  );
}

export async function getTestClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  testClientConfig?: Partial<ViemTestClientConfig>,
): Promise<TestClient> {
  const chain =
    testClientConfig?.chain ?? (await getChain(provider, chainType));
  const mode = await getMode(provider);
  const parameters = { ...DEFAULT_CLIENT_PARAMETERS, ...testClientConfig };

  const testClient = createTestClient({
    chain,
    mode,
    transport: customTransport(provider),
    ...parameters,
  });

  return testClient;
}

const DEFAULT_CLIENT_PARAMETERS = { pollingInterval: 50, cacheTime: 0 };

async function getDefaultClientParameters(provider: EthereumProvider) {
  return (await isDevelopmentNetwork(provider))
    ? DEFAULT_CLIENT_PARAMETERS
    : {};
}
