import type {
  GetPublicClientReturnType,
  GetWalletClientReturnType,
  TestClient,
} from "./types.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

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
  publicClientConfig?: Partial<viemT.PublicClientConfig>,
): Promise<GetPublicClientReturnType<ChainTypeT>> {
  const chain = publicClientConfig?.chain ?? (await getChain(provider));
  const parameters = {
    ...getDefaultClientParameters(chain.id),
    ...publicClientConfig,
  };

  const publicClient = createPublicClient({
    chain,
    transport: customTransport(provider),
    ...parameters,
  });

  if (chainType === "optimism") {
    publicClient.extend(publicActionsL2());
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We need to assert the type because TS gets confused with the conditional type */
  return publicClient as GetPublicClientReturnType<ChainTypeT>;
}

export async function getWalletClients<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<Array<GetWalletClientReturnType<ChainTypeT>>> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const accounts = await getAccounts(provider);
  const parameters = {
    ...getDefaultClientParameters(chain.id),
    ...walletClientConfig,
  };

  const walletClients = accounts.map((account) =>
    createWalletClient({
      chain,
      account,
      transport: customTransport(provider),
      ...parameters,
    }),
  );

  if (chainType === "optimism") {
    walletClients.map((walletClient) => walletClient.extend(walletActionsL2()));
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We need to assert the type because TS gets confused with the conditional type */
  return walletClients as Array<GetWalletClientReturnType<ChainTypeT>>;
}

export async function getWalletClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  address: viemT.Address,
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<GetWalletClientReturnType<ChainTypeT>> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
  const parameters = {
    ...getDefaultClientParameters(chain.id),
    ...walletClientConfig,
  };

  const walletClient = createWalletClient({
    chain,
    account: address,
    transport: customTransport(provider),
    ...parameters,
  });

  if (chainType === "optimism") {
    walletClient.extend(walletActionsL2());
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
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<GetWalletClientReturnType<ChainTypeT>> {
  const chain = walletClientConfig?.chain ?? (await getChain(provider));
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

export async function getTestClient(
  provider: EthereumProvider,
  testClientConfig?: Partial<viemT.TestClientConfig>,
): Promise<TestClient> {
  const chain = testClientConfig?.chain ?? (await getChain(provider));
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

function getDefaultClientParameters(chainId: number) {
  return isDevelopmentNetwork(chainId) ? DEFAULT_CLIENT_PARAMETERS : {};
}
