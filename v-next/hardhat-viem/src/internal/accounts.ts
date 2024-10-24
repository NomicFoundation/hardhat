import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type { Address as ViemAddress } from "viem";

const accountsCache = new WeakMap<EthereumProvider, ViemAddress[]>();

export async function getAccounts(
  provider: EthereumProvider,
): Promise<ViemAddress[]> {
  const cachedAccounts = accountsCache.get(provider);
  if (cachedAccounts !== undefined) {
    return cachedAccounts;
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- We know that the provider is going to return an array of accounts */
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as ViemAddress[];
  accountsCache.set(provider, accounts);

  return accounts;
}
