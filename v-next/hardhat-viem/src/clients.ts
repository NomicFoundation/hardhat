import type {
  GetPublicClientReturnType,
  TestClient,
  WalletClient,
} from "./types.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

import { createPublicClient, custom as customTransport } from "viem";
import { publicActionsL2 } from "viem/op-stack";

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
