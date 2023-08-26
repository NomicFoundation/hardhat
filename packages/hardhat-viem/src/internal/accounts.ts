import type { EthereumProvider } from "hardhat/types";
import type { Address } from "viem";

import memoize from "lodash.memoize";

export async function getAccounts(provider: EthereumProvider) {
  return _memoizedGetAccounts(provider);
}

const _memoizedGetAccounts = memoize(
  async (provider: EthereumProvider): Promise<Address[]> =>
    provider.send("eth_accounts")
);
