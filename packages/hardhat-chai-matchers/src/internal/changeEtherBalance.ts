import type { BigNumberish, providers } from "ethers";

import { ensure } from "./calledOnContract/utils";
import { Account, getAddressOf } from "./misc/account";
import { BalanceChangeOptions } from "./misc/balance";

export function supportChangeEtherBalance(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "changeEtherBalance",
    function (
      this: any,
      account: Account | string,
      balanceChange: BigNumberish,
      options?: BalanceChangeOptions
    ) {
      const { BigNumber } = require("ethers");
      const subject = this._obj;

      const derivedPromise = Promise.all([
        getBalanceChange(subject, account, options),
        getAddressOf(account),
      ]).then(([actualChange, address]) => {
        this.assert(
          actualChange.eq(BigNumber.from(balanceChange)),
          `Expected "${address}" to change balance by ${balanceChange.toString()} wei, ` +
            `but it has changed by ${actualChange.toString()} wei`,
          `Expected "${address}" to not change balance by ${balanceChange.toString()} wei, but it did`,
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
    | Promise<providers.TransactionResponse>
    | (() =>
        | Promise<providers.TransactionResponse>
        | providers.TransactionResponse),
  account: Account | string,
  options?: BalanceChangeOptions
) {
  const { BigNumber } = await import("ethers");
  const hre = await import("hardhat");
  const provider = hre.network.provider;

  let txResponse: providers.TransactionResponse;

  if (typeof transaction === "function") {
    txResponse = await transaction();
  } else {
    txResponse = await transaction;
  }

  const txReceipt = await txResponse.wait();
  const txBlockNumber = txReceipt.blockNumber;

  const block = await provider.send("eth_getBlockByHash", [
    txReceipt.blockHash,
    false,
  ]);

  ensure(
    block.transactions.length === 1,
    Error,
    "Multiple transactions found in block"
  );

  const address = await getAddressOf(account);

  const balanceAfter = await provider.send("eth_getBalance", [
    address,
    `0x${txBlockNumber.toString(16)}`,
  ]);

  const balanceBefore = await provider.send("eth_getBalance", [
    address,
    `0x${(txBlockNumber - 1).toString(16)}`,
  ]);

  if (options?.includeFee !== true && address === txResponse.from) {
    const gasPrice = txReceipt.effectiveGasPrice ?? txResponse.gasPrice;
    const gasUsed = txReceipt.gasUsed;
    const txFee = gasPrice.mul(gasUsed);

    return BigNumber.from(balanceAfter).add(txFee).sub(balanceBefore);
  } else {
    return BigNumber.from(balanceAfter).sub(balanceBefore);
  }
}
