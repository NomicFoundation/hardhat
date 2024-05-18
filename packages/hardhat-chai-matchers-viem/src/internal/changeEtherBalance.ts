import type { WalletClient } from "viem";

import type { BalanceChangeOptions } from "./misc/balance";

import { buildAssert } from "../utils";
import { ensure } from "./calledOnContract/utils";
import { getAddressOf } from "./misc/account";
import { CHANGE_ETHER_BALANCE_MATCHER } from "./constants";
import {
  assertIsNotNull,
  waitForTransactionReceipt,
  preventAsyncMatcherChaining,
} from "./utils";

export function supportChangeEtherBalance(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    CHANGE_ETHER_BALANCE_MATCHER,
    function (
      this: any,
      account: WalletClient | { address: `0x${string}` } | `0x${string}`,
      balanceChange: bigint | number | string | ((change: bigint) => boolean),
      options?: BalanceChangeOptions
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;
      const subject = this._obj;

      preventAsyncMatcherChaining(
        this,
        CHANGE_ETHER_BALANCE_MATCHER,
        chaiUtils
      );

      const checkBalanceChange = ([actualChange, address]: [
        bigint,
        string
      ]) => {
        const assert = buildAssert(negated, checkBalanceChange);

        if (typeof balanceChange === "function") {
          assert(
            balanceChange(actualChange),
            `Expected the ether balance change of "${address}" to satisfy the predicate, but it didn't (balance change: ${actualChange.toString()} wei)`,
            `Expected the ether balance change of "${address}" to NOT satisfy the predicate, but it did (balance change: ${actualChange.toString()} wei)`
          );
        } else {
          const expectedChange = BigInt(balanceChange);
          assert(
            actualChange === expectedChange,
            `Expected the ether balance of "${address}" to change by ${balanceChange.toString()} wei, but it changed by ${actualChange.toString()} wei`,
            `Expected the ether balance of "${address}" NOT to change by ${balanceChange.toString()} wei, but it did`
          );
        }
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
    | `0x${string}`
    | Promise<`0x${string}`>
    | (() => Promise<`0x${string}`> | `0x${string}`),
  account: WalletClient | { address: `0x${string}` } | `0x${string}`,
  options?: BalanceChangeOptions
): Promise<bigint> {
  const { network } = await import("hardhat");
  const provider = network.provider;

  let hash: `0x${string}`;

  if (typeof transaction === "function") {
    hash = await transaction();
  } else {
    hash = await transaction;
  }

  const txReceipt = await waitForTransactionReceipt(hash);

  assertIsNotNull(txReceipt, "txReceipt");
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

  const balanceAfterHex = await provider.send("eth_getBalance", [
    address,
    `0x${txBlockNumber.toString(16)}`,
  ]);

  const balanceBeforeHex = await provider.send("eth_getBalance", [
    address,
    `0x${(txBlockNumber - 1n).toString(16)}`,
  ]);

  const balanceAfter = BigInt(balanceAfterHex);
  const balanceBefore = BigInt(balanceBeforeHex);

  if (
    options?.includeFee !== true &&
    address.toLowerCase() === txReceipt.from.toLowerCase()
  ) {
    const gasPrice = txReceipt.effectiveGasPrice;
    const gasUsed = txReceipt.gasUsed;
    const txFee = gasPrice * gasUsed;

    return balanceAfter + txFee - balanceBefore;
  } else {
    return balanceAfter - balanceBefore;
  }
}
