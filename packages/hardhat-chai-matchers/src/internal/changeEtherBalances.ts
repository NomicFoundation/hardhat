import type EthersT from "ethers";
// eslint-disable-next-line no-duplicate-imports
import type { BigNumber, BigNumberish, providers } from "ethers";
import ordinal from "ordinal";

import { buildAssert } from "../utils";
import { getAddressOf, Account } from "./misc/account";
import {
  BalanceChangeOptions,
  getAddresses,
  getBalances,
} from "./misc/balance";

export function supportChangeEtherBalances(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "changeEtherBalances",
    function (
      this: any,
      accounts: Array<Account | string>,
      expectedChanges: BigNumberish[] | ((changes: BigNumber[]) => boolean),
      options?: BalanceChangeOptions
    ) {
      const { BigNumber } = require("ethers") as typeof EthersT;

      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      if (
        typeof expectedChanges !== "function" &&
        accounts.length !== expectedChanges.length
      ) {
        throw new Error(
          `The number of accounts (${accounts.length}) is different than the number of expected balance changes (${expectedChanges.length})`
        );
      }

      const checkBalanceChanges = (
        actualChanges: BigNumber[],
        accountAddresses: string[]
      ) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        if (typeof expectedChanges === "function") {
          assert(
            expectedChanges(actualChanges),
            "Expected the balance changes of to satisfy the predicate, but they didn't",
            "Expected the balance changes of to NOT satisfy the predicate, but they did"
          );
        } else {
          assert(
            actualChanges.every((change, ind) =>
              change.eq(BigNumber.from(expectedChanges[ind]))
            ),
            () => {
              const lines: string[] = [];
              actualChanges.forEach((actualChange: BigNumber, i) => {
                const expectedChange = BigNumber.from(expectedChanges[i]);
                if (!actualChange.eq(expectedChange)) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) to change by ${expectedChange.toString()} wei, but it changed by ${actualChange.toString()} wei`
                  );
                }
              });
              return lines.join("\n");
            },
            () => {
              const lines: string[] = [];
              actualChanges.forEach((actualChange: BigNumber, i) => {
                const expectedChange = BigNumber.from(expectedChanges[i]);
                if (actualChange.eq(expectedChange)) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) NOT to change by ${expectedChange.toString()} wei, but it did`
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
      ]).then(([balanceChanges, addresses]) =>
        checkBalanceChanges(balanceChanges, addresses)
      );
      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    }
  );
}

export async function getBalanceChanges(
  transaction:
    | providers.TransactionResponse
    | Promise<providers.TransactionResponse>,
  accounts: Array<Account | string>,
  options?: BalanceChangeOptions
): Promise<BigNumber[]> {
  const txResponse = await transaction;

  const txReceipt = await txResponse.wait();
  const txBlockNumber = txReceipt.blockNumber;

  const balancesAfter = await getBalances(accounts, txBlockNumber);
  const balancesBefore = await getBalances(accounts, txBlockNumber - 1);

  const txFees = await getTxFees(accounts, txResponse, options);

  return balancesAfter.map((balance, ind) =>
    balance.add(txFees[ind]).sub(balancesBefore[ind])
  );
}

async function getTxFees(
  accounts: Array<Account | string>,
  txResponse: providers.TransactionResponse,
  options?: BalanceChangeOptions
) {
  return Promise.all(
    accounts.map(async (account) => {
      if (
        options?.includeFee !== true &&
        (await getAddressOf(account)) === txResponse.from
      ) {
        const txReceipt = await txResponse.wait();
        const gasPrice = txReceipt.effectiveGasPrice ?? txResponse.gasPrice;
        const gasUsed = txReceipt.gasUsed;
        const txFee = gasPrice.mul(gasUsed);

        return txFee;
      }

      return 0;
    })
  );
}
