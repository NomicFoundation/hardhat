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
      balanceChanges: BigNumberish[] | ((changes: BigNumber[]) => boolean),
      options?: BalanceChangeOptions
    ) {
      const { BigNumber } = require("ethers");

      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      if (
        typeof balanceChanges !== "function" &&
        accounts.length !== balanceChanges.length
      ) {
        throw new Error(
          `The number of accounts (${accounts.length}) is different than the number of expected balance changes (${balanceChanges.length})`
        );
      }

      const checkBalanceChanges = ([actualChanges, accountAddresses]: [
        Array<typeof BigNumber>,
        string[]
      ]) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        if (typeof balanceChanges === "function") {
          assert(
            balanceChanges(actualChanges),
            "Expected the balance changes of to satisfy the predicate, but they didn't",
            "Expected the balance changes of to NOT satisfy the predicate, but they did"
          );
        } else {
          assert(
            actualChanges.every((change, ind) =>
              change.eq(BigNumber.from(balanceChanges[ind] as BigNumberish[]))
            ),
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: BigNumber, i) => {
                const balance = (balanceChanges as BigNumberish[])[i];
                if (!change.eq(BigNumber.from(balance))) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) to change by ${balance.toString()} wei, but it changed by ${change.toString()} wei`
                  );
                }
              });
              return lines.join("\n");
            },
            () => {
              const lines: string[] = [];
              actualChanges.forEach((change: BigNumber, i) => {
                const balance = (balanceChanges as BigNumberish[])[i];
                if (change.eq(BigNumber.from(balance))) {
                  lines.push(
                    `Expected the ether balance of ${
                      accountAddresses[i]
                    } (the ${ordinal(
                      i + 1
                    )} address in the list) NOT to change by ${balance.toString()} wei, but it did`
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

export async function getBalanceChanges(
  transaction:
    | providers.TransactionResponse
    | Promise<providers.TransactionResponse>,
  accounts: Array<Account | string>,
  options?: BalanceChangeOptions
) {
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
