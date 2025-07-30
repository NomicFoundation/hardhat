import type {
  GetPublicClientReturnType,
  GetWalletClientReturnType,
  TestClient,
} from "../types.js";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";
import type {
  Address as ViemAddress,
  PublicClientConfig as ViemPublicClientConfig,
  TestClientConfig as ViemTestClientConfig,
  WalletClientConfig as ViemWalletClientConfig,
} from "viem";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
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
  const chain = publicClientConfig?.chain ?? (await getChain(provider));
  const { defaultClientParams, defaultTransportParams } =
    await getDefaultParams(provider);

  let publicClient = createPublicClient({
    chain,
    transport: customTransport(provider, defaultTransportParams),
    ...defaultClientParams,
    ...publicClientConfig,
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
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const accounts = await getAccounts(provider);
  const { defaultClientParams, defaultTransportParams } =
    await getDefaultParams(provider);

  let walletClients = accounts.map((account) =>
    createWalletClient({
      chain,
      account,
      transport: customTransport(provider, defaultTransportParams),
      ...defaultClientParams,
      ...walletClientConfig,
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
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const { defaultClientParams, defaultTransportParams } =
    await getDefaultParams(provider);

  let walletClient = createWalletClient({
    chain,
    account: address,
    transport: customTransport(provider, defaultTransportParams),
    ...defaultClientParams,
    ...walletClientConfig,
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
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const [defaultAccount] = await getAccounts(provider);

  if (defaultAccount === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.DEFAULT_WALLET_CLIENT_NOT_FOUND,
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
  const chain = testClientConfig?.chain ?? (await getChain(provider));
  const mode = await getMode(provider);

  const testClient = createTestClient({
    chain,
    mode,
    transport: customTransport(provider, DEFAULT_DEVELOPMENT_TRANSPORT_PARAMS),
    ...DEFAULT_DEVELOPMENT_CLIENT_PARAMS,
    ...testClientConfig,
  });

  return testClient;
}

const DEFAULT_DEVELOPMENT_CLIENT_PARAMS = { pollingInterval: 50, cacheTime: 0 };
const DEFAULT_DEVELOPMENT_TRANSPORT_PARAMS = { retryCount: 0 };

async function getDefaultParams(provider: EthereumProvider) {
  const isDevelopment = await isDevelopmentNetwork(provider);
  return isDevelopment
    ? {
        defaultClientParams: DEFAULT_DEVELOPMENT_CLIENT_PARAMS,
        defaultTransportParams: DEFAULT_DEVELOPMENT_TRANSPORT_PARAMS,
      }
    : {};
}
