import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { Addressable } from "ethers";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";

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
  ethers: HardhatEthers,
  accounts: Array<Addressable | string>,
  blockNumber: number,
): Promise<bigint[]> {
  return Promise.all(
    accounts.map(async (account) => {
      const address = await getAddressOf(account);

      const result = await ethers.provider.getBalance(address, blockNumber);
      assertCanBeConvertedToBigint(result);

      return toBigInt(result);
    }),
  );
}
