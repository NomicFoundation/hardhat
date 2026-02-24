import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { Addressable } from "ethers";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { assert as chaiAssert } from "chai";

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

      let result;
      try {
        result = await ethers.provider.getBalance(address, blockNumber);
      } catch (cause) {
        try {
          chaiAssert.fail(
            "Failed to get the balance of the account " + address,
          );
        } catch (e) {
          ensureError(e);
          e.cause = cause;

          throw e;
        }
      }

      assertCanBeConvertedToBigint(result);

      return toBigInt(result);
    }),
  );
}
