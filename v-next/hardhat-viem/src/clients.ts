import type {
  GetPublicClientReturnType,
  GetWalletClientReturnType,
  TestClient,
  WalletClient,
} from "./types.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

import {
  createPublicClient,
  createWalletClient,
  custom as customTransport,
} from "viem";
import { publicActionsL2, walletActionsL2 } from "viem/op-stack";

import { getAccounts } from "./accounts.js";
import { getChain, isDevelopmentNetwork } from "./chains.js";

export async function getPublicClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  publicClientConfig?: Partial<viemT.PublicClientConfig>,
): Promise<GetPublicClientReturnType<ChainTypeT>> {
  const chain = publicClientConfig?.chain ?? (await getChain(provider));
  const defaultParameters = isDevelopmentNetwork(chain.id)
    ? { pollingInterval: 50, cacheTime: 0 }
    : {};
  const parameters = { ...defaultParameters, ...publicClientConfig };

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
  const defaultParameters = isDevelopmentNetwork(chain.id)
    ? { pollingInterval: 50, cacheTime: 0 }
    : {};
  const parameters = { ...defaultParameters, ...walletClientConfig };

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
  const defaultParameters = isDevelopmentNetwork(chain.id)
    ? { pollingInterval: 50, cacheTime: 0 }
    : {};
  const parameters = { ...defaultParameters, ...walletClientConfig };

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

export async function getTestClient<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  chainType: ChainTypeT,
  testClientConfig?: Partial<viemT.TestClientConfig>,
): Promise<TestClient> {
  // ...
}
