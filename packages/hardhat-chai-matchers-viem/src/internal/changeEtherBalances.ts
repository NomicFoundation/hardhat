import type { WalletClient, TransactionReceipt } from "viem";

import type { BalanceChangeOptions } from "./misc/balance";
import type OrdinalT from "ordinal";

import { buildAssert } from "../utils";
import { getAddressOf } from "./misc/account";
import { getAddresses, getBalances } from "./misc/balance";
import { CHANGE_ETHER_BALANCES_MATCHER } from "./constants";
import {
  assertIsNotNull,
  waitForTransactionReceipt,
  preventAsyncMatcherChaining,
} from "./utils";

export function supportChangeEtherBalances(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    CHANGE_ETHER_BALANCES_MATCHER,
    function (
      this: any,
      accounts: Array<
        WalletClient | { address: `0x${string}` } | `0x${string}`
      >,
      balanceChanges:
        | Array<bigint | number | string>
        | ((changes: bigint[]) => boolean),
      options?: BalanceChangeOptions
    ) {
      const ordinal = require("ordinal") as typeof OrdinalT;
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      preventAsyncMatcherChaining(
        this,
        CHANGE_ETHER_BALANCES_MATCHER,
        chaiUtils
      );

      validateInput(this._obj, accounts, balanceChanges);

      const checkBalanceChanges = ([actualChanges, accountAddresses]: [
        bigint[],
        string[]
      ]) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        if (typeof balanceChanges === "function") {
          assert(
            balanceChanges(actualChanges),
            "Expected the balance changes of the accounts to satisfy the predicate, but they didn't",
            "Expected the balance changes of the accounts to NOT satisfy the predicate, but they did"
          );
        } else {
          assert(
            actualChanges.every(
              (change, ind) => change === BigInt(balanceChanges[ind])
            ),
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: bigint, i) => {
                if (change !== BigInt(balanceChanges[i])) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) to change by ${balanceChanges[
                      i
                    ].toString()} wei, but it changed by ${change.toString()} wei`
                  );
                }
              });
              return lines.join("\n");
            },
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: bigint, i) => {
                if (change === BigInt(balanceChanges[i])) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) NOT to change by ${balanceChanges[
                      i
                    ].toString()} wei, but it did`
                  );
                }
              });
              return lines.join("\n");
            }
          );
        }
      };

      const derivedPromise = Promise.all([
        getBalanceChanges(subject, accounts, options),
        getAddresses(accounts),
      ]).then(checkBalanceChanges);
      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    }
  );
}

function validateInput(
  obj: any,
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>,
  balanceChanges:
    | Array<bigint | number | string>
    | ((changes: bigint[]) => boolean)
) {
  try {
    if (
      Array.isArray(balanceChanges) &&
      accounts.length !== balanceChanges.length
    ) {
      throw new Error(
        `The number of accounts (${accounts.length}) is different than the number of expected balance changes (${balanceChanges.length})`
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
  transaction: `0x${string}` | Promise<`0x${string}`>,
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>,
  options?: BalanceChangeOptions
): Promise<bigint[]> {
  const hash = await transaction;

  const txReceipt = await waitForTransactionReceipt(hash);

  assertIsNotNull(txReceipt, "txReceipt");
  const txBlockNumber = txReceipt.blockNumber;

  const balancesAfter = await getBalances(accounts, txBlockNumber);
  const balancesBefore = await getBalances(accounts, txBlockNumber - 1n);

  const txFees = await getTxFees(accounts, txReceipt, options);

  return balancesAfter.map(
    (balance, ind) => balance + txFees[ind] - balancesBefore[ind]
  );
}

async function getTxFees(
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>,
  txReceipt: TransactionReceipt,
  options?: BalanceChangeOptions
): Promise<bigint[]> {
  return Promise.all(
    accounts.map(async (account) => {
      if (
        options?.includeFee !== true &&
        (await getAddressOf(account)).toLowerCase() ===
          txReceipt.from.toLowerCase()
      ) {
        const gasPrice = txReceipt.effectiveGasPrice;
        const gasUsed = txReceipt.gasUsed;
        const txFee = gasPrice * gasUsed;

        return txFee;
      }

      return 0n;
    })
  );
}
