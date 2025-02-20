import type { BalanceChangeOptions } from "../utils/balance.js";
import type { Addressable } from "ethers/address";
import type { TransactionResponse } from "ethers/providers";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "ethers/utils";

import { CHANGE_ETHER_BALANCES_MATCHER } from "../constants.js";
import { getAddressOf } from "../utils/account.js";
import { assertIsNotNull } from "../utils/asserts.js";
import { getAddresses, getBalances } from "../utils/balance.js";
import { buildAssert } from "../utils/build-assert.js";
import { ordinal } from "../utils/ordinal.js";
import { preventAsyncMatcherChaining } from "../utils/prevent-chaining.js";

export function supportChangeEtherBalances(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    CHANGE_ETHER_BALANCES_MATCHER,
    function (
      this: any,
      provider: EthereumProvider,
      accounts: Array<Addressable | string>,
      balanceChanges: bigint[] | ((changes: bigint[]) => boolean),
      options?: BalanceChangeOptions,
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      preventAsyncMatcherChaining(
        this,
        CHANGE_ETHER_BALANCES_MATCHER,
        chaiUtils,
      );

      validateInput(this._obj, accounts, balanceChanges);

      const checkBalanceChanges = ([actualChanges, accountAddresses]: [
        bigint[],
        string[],
      ]) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        if (typeof balanceChanges === "function") {
          assert(
            balanceChanges(actualChanges),
            "Expected the balance changes of the accounts to satisfy the predicate, but they didn't",
            "Expected the balance changes of the accounts to NOT satisfy the predicate, but they did",
          );
        } else {
          assert(
            actualChanges.every(
              (change, ind) => change === toBigInt(balanceChanges[ind]),
            ),
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: bigint, i) => {
                if (change !== toBigInt(balanceChanges[i])) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1,
                    )} address in the list) to change by ${balanceChanges[
                      i
                    ].toString()} wei, but it changed by ${change.toString()} wei`,
                  );
                }
              });
              return lines.join("\n");
            },
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: bigint, i) => {
                if (change === toBigInt(balanceChanges[i])) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1,
                    )} address in the list) NOT to change by ${balanceChanges[
                      i
                    ].toString()} wei, but it did`,
                  );
                }
              });
              return lines.join("\n");
            },
          );
        }
      };

      const derivedPromise = Promise.all([
        getBalanceChanges(provider, subject, accounts, options),
        getAddresses(accounts),
      ]).then(checkBalanceChanges);
      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    },
  );
}

function validateInput(
  obj: any,
  accounts: Array<Addressable | string>,
  balanceChanges: bigint[] | ((changes: bigint[]) => boolean),
) {
  try {
    if (
      Array.isArray(balanceChanges) &&
      accounts.length !== balanceChanges.length
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CHAI_MATCHERS.ACCOUNTS_NUMBER_DIFFERENT_FROM_BALANCE_CHANGES,
        {
          accounts: accounts.length,
          balanceChanges: balanceChanges.length,
        },
      );
    }
  } catch (e) {
    // if the input validation fails, we discard the subject since it could
    // potentially be a rejected promise
    Promise.resolve(obj).catch(() => {});
    throw e;
  }
}

export async function getBalanceChanges(
  provider: EthereumProvider,
  transaction: TransactionResponse | Promise<TransactionResponse>,
  accounts: Array<Addressable | string>,
  options?: BalanceChangeOptions,
): Promise<bigint[]> {
  const txResponse = await transaction;

  const txReceipt = await txResponse.wait();
  assertIsNotNull(txReceipt, "txReceipt");
  const txBlockNumber = txReceipt.blockNumber;

  const balancesAfter = await getBalances(provider, accounts, txBlockNumber);
  const balancesBefore = await getBalances(
    provider,
    accounts,
    txBlockNumber - 1,
  );

  const txFees = await getTxFees(accounts, txResponse, options);

  return balancesAfter.map(
    (balance, ind) => balance + txFees[ind] - balancesBefore[ind],
  );
}

async function getTxFees(
  accounts: Array<Addressable | string>,
  txResponse: TransactionResponse,
  options?: BalanceChangeOptions,
): Promise<bigint[]> {
  return Promise.all(
    accounts.map(async (account) => {
      if (
        options?.includeFee !== true &&
        (await getAddressOf(account)) === txResponse.from
      ) {
        const txReceipt = await txResponse.wait();
        assertIsNotNull(txReceipt, "txReceipt");
        const gasPrice = txReceipt.gasPrice ?? txResponse.gasPrice;
        const gasUsed = txReceipt.gasUsed;
        const txFee = gasPrice * gasUsed;

        return txFee;
      }

      return 0n;
    }),
  );
}
