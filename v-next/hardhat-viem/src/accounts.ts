import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type * as viemT from "viem";

const accountsCache = new Map<EthereumProvider, viemT.Account[]>();

export async function getAccounts(
  provider: EthereumProvider,
): Promise<viemT.Account[]> {
  const cachedAccounts = accountsCache.get(provider);
  if (cachedAccounts !== undefined) {
    return cachedAccounts;
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- We know that the provider is going to return an array of accounts */
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as viemT.Account[];
  accountsCache.set(provider, accounts);

  return accounts;
}
