import type { Addressable } from "ethers";
import type { EthereumProvider } from "hardhat/types/providers";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { getAddressOf } from "./account.js";
import { assertCanBeConvertedToBigint } from "./asserts.js";

export interface BalanceChangeOptions {
  includeFee?: boolean;
}

export function getAddresses(
  accounts: Array<Addressable | string>,
): Promise<string[]> {
  return Promise.all(accounts.map((account) => getAddressOf(account)));
}

export async function getBalances(
  provider: EthereumProvider,
  accounts: Array<Addressable | string>,
  blockNumber?: number,
): Promise<bigint[]> {
  return Promise.all(
    accounts.map(async (account) => {
      const address = await getAddressOf(account);

      const result = await provider.request({
        method: "eth_getBalance",
        params: [address, numberToHexString(blockNumber ?? 0)],
      });

      assertCanBeConvertedToBigint(result);

      return toBigInt(result);
    }),
  );
}
