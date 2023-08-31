import type { EthereumProvider } from "hardhat/types";
import type { Address } from "viem";

import memoize from "lodash.memoize";

export const getAccounts = memoize(
  async (provider: EthereumProvider): Promise<Address[]> =>
    provider.send("eth_accounts")
);
