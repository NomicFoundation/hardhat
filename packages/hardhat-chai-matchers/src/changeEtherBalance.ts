import { BigNumber, BigNumberish, providers } from "ethers";
import { ensure } from "./calledOnContract/utils";
import { Account, getAddressOf } from "./misc/account";
import { BalanceChangeOptions } from "./misc/balance";

export function supportChangeEtherBalance(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "changeEtherBalance",
    function (
      this: any,
      account: Account,
      balanceChange: BigNumberish,
      options: BalanceChangeOptions
    ) {
      const subject = this._obj;
      const derivedPromise = Promise.all([
        getBalanceChange(subject, account, options),
        getAddressOf(account),
      ]).then(([actualChange, address]) => {
        this.assert(
          actualChange.eq(BigNumber.from(balanceChange)),
          `Expected "${address}" to change balance by ${balanceChange} wei, ` +
            `but it has changed by ${actualChange} wei`,
          `Expected "${address}" to not change balance by ${balanceChange} wei,`,
          balanceChange,
          actualChange
        );
      });
      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    }
  );
}

export async function getBalanceChange(
  transaction:
    | providers.TransactionResponse
    | (() =>
        | Promise<providers.TransactionResponse>
        | providers.TransactionResponse),
  account: Account,
  options?: BalanceChangeOptions
) {
  ensure(account.provider !== undefined, TypeError, "Provider not found");

  let txResponse: providers.TransactionResponse;

  if (typeof transaction === "function") {
    txResponse = await transaction();
  } else {
    txResponse = transaction;
  }

  const txReceipt = await txResponse.wait();
  const txBlockNumber = txReceipt.blockNumber;

  const balanceAfter = await account.provider.getBalance(
    getAddressOf(account),
    txBlockNumber
  );
  const balanceBefore = await account.provider.getBalance(
    getAddressOf(account),
    txBlockNumber - 1
  );

  if (
    options?.includeFee !== true &&
    (await getAddressOf(account)) === txResponse.from
  ) {
    const gasPrice = txResponse.gasPrice ?? txReceipt.effectiveGasPrice;
    const gasUsed = txReceipt.gasUsed;
    const txFee = gasPrice.mul(gasUsed);

    return balanceAfter.add(txFee).sub(balanceBefore);
  } else {
    return balanceAfter.sub(balanceBefore);
  }
}
