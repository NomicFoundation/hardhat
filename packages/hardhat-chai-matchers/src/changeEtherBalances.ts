import type { BigNumberish, providers } from "ethers";

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
      balanceChanges: BigNumberish[],
      options?: BalanceChangeOptions
    ) {
      const { BigNumber } = require("ethers");
      const subject = this._obj;

      const derivedPromise = Promise.all([
        getBalanceChanges(subject, accounts, options),
        getAddresses(accounts),
      ]).then(([actualChanges, accountAddresses]) => {
        this.assert(
          actualChanges.every((change, ind) =>
            change.eq(BigNumber.from(balanceChanges[ind]))
          ),
          () => {
            const lines: string[] = [];
            actualChanges.forEach((change, i) => {
              if (!change.eq(BigNumber.from(balanceChanges[i]))) {
                lines.push(
                  `Expected ${
                    accountAddresses[i]
                  } (address #${i} in the list) to change balance by ${balanceChanges[
                    i
                  ].toString()} wei, but it has changed by ${change.toString()} wei`
                );
              }
            });
            return lines.join("\n");
          },
          () => {
            const lines: string[] = [];
            actualChanges.forEach((change, i) => {
              if (change.eq(BigNumber.from(balanceChanges[i]))) {
                lines.push(
                  `Expected ${
                    accountAddresses[i]
                  } (address #${i} in the list) not to change balance by ${balanceChanges[
                    i
                  ].toString()} wei`
                );
              }
            });
            return lines.join("\n");
          },
          balanceChanges.map(
            (balanceChange, i) =>
              `${
                accountAddresses[i]
              } balance changed by ${balanceChange.toString()} wei`
          ),
          actualChanges.map(
            (actualChange, i) =>
              `${
                accountAddresses[i]
              } balance changed by ${actualChange.toString()} wei`
          )
        );
      });
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
    | Promise<providers.TransactionResponse>
    | (() =>
        | Promise<providers.TransactionResponse>
        | providers.TransactionResponse),
  accounts: Array<Account | string>,
  options?: BalanceChangeOptions
) {
  let txResponse: providers.TransactionResponse;

  if (typeof transaction === "function") {
    txResponse = await transaction();
  } else {
    txResponse = await transaction;
  }

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
