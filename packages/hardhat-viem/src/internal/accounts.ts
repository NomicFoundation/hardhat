import type { EthereumProvider } from "hardhat/types";
import type { Address } from "viem";

import memoize from "lodash.memoize";

export const getAccounts = memoize(
  async (provider: EthereumProvider): Promise<Address[]> =>
    provider.send("eth_accounts").catch((error) => {
      if (
        error instanceof Error &&
        /the method has been deprecated: eth_accounts/.test(error.message)
      ) {
        return [];
      }

      throw error;
    })
);
