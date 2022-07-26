import type { BigNumberish, providers } from "ethers";

import { buildAssert } from "../utils";
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

      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;
      const subject = this._obj;

      const checkBalanceChange = ([actualChange, address]: [
        typeof BigNumber,
        string
      ]) => {
        const assert = buildAssert(negated, checkBalanceChange);

        assert(
          actualChange.eq(BigNumber.from(balanceChange)),
          `Expected the ether balance of "${address}" to change by ${balanceChange.toString()} wei, but it changed by ${actualChange.toString()} wei`,
          `Expected the ether balance of "${address}" NOT to change by ${balanceChange.toString()} wei, but it did`
        );
      };

      const derivedPromise = Promise.all([
        getBalanceChange(subject, account, options),
        getAddressOf(account),
      ]).then(checkBalanceChange);
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
