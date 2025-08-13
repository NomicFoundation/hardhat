import type { BalanceChangeOptions } from "../utils/balance.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { Addressable } from "ethers/address";
import type { TransactionResponse } from "ethers/providers";
import type { BigNumberish } from "ethers/utils";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { toBigInt } from "ethers/utils";

import { CHANGE_ETHER_BALANCE_MATCHER } from "../constants.js";
import { getAddressOf } from "../utils/account.js";
import {
  assertCanBeConvertedToBigint,
  assertIsNotNull,
} from "../utils/asserts.js";
import { buildAssert } from "../utils/build-assert.js";
import { preventAsyncMatcherChaining } from "../utils/prevent-chaining.js";

export function supportChangeEtherBalance(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    CHANGE_ETHER_BALANCE_MATCHER,
    function (
      this: any,
      ethers: HardhatEthers,
      account: Addressable | string,
      balanceChange: BigNumberish | ((change: bigint) => boolean),
      options?: BalanceChangeOptions,
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;
      const subject = this._obj;

      preventAsyncMatcherChaining(
        this,
        CHANGE_ETHER_BALANCE_MATCHER,
        chaiUtils,
      );

      const checkBalanceChange = ([actualChange, address]: [
        bigint,
        string,
      ]) => {
        const assert = buildAssert(negated, checkBalanceChange);

        if (typeof balanceChange === "function") {
          assert(
            balanceChange(actualChange),
            `Expected the ether balance change of "${address}" to satisfy the predicate, but it didn't (balance change: ${actualChange.toString()} wei)`,
            `Expected the ether balance change of "${address}" to NOT satisfy the predicate, but it did (balance change: ${actualChange.toString()} wei)`,
          );
        } else {
          const expectedChange = toBigInt(balanceChange);
          assert(
            actualChange === expectedChange,
            `Expected the ether balance of "${address}" to change by ${balanceChange.toString()} wei, but it changed by ${actualChange.toString()} wei`,
            `Expected the ether balance of "${address}" NOT to change by ${balanceChange.toString()} wei, but it did`,
          );
        }
      };

      const derivedPromise = Promise.all([
        getBalanceChange(ethers, subject, account, options),
        getAddressOf(account),
      ]).then(checkBalanceChange);
      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    },
  );
}

export async function getBalanceChange(
  ethers: HardhatEthers,
  transaction:
    | TransactionResponse
    | Promise<TransactionResponse>
    | (() => Promise<TransactionResponse> | TransactionResponse),
  account: Addressable | string,
  options?: BalanceChangeOptions,
): Promise<bigint> {
  let txResponse: TransactionResponse;

  if (typeof transaction === "function") {
    txResponse = await transaction();
  } else {
    txResponse = await transaction;
  }

  const txReceipt = await txResponse.wait();
  assertIsNotNull(txReceipt, "txReceipt");
  const txBlockNumber = txReceipt.blockNumber;

  const block = await ethers.provider.getBlock(txReceipt.blockHash, false);

  assertHardhatInvariant(block !== null, "The block doesn't exist");

  assertHardhatInvariant(
    isObject(block) &&
      Array.isArray(block.transactions) &&
      block.transactions.length === 1,
    "There should be only 1 transaction in the block",
  );

  const address = await getAddressOf(account);

  const balanceAfterHex = await ethers.provider.getBalance(
    address,
    txBlockNumber,
  );

  const balanceBeforeHex = await ethers.provider.getBalance(
    address,
    txBlockNumber - 1,
  );

  assertCanBeConvertedToBigint(balanceAfterHex);
  assertCanBeConvertedToBigint(balanceBeforeHex);

  const balanceAfter = BigInt(balanceAfterHex);
  const balanceBefore = BigInt(balanceBeforeHex);

  if (options?.includeFee !== true && address === txResponse.from) {
    const gasPrice = txReceipt.gasPrice;
    const gasUsed = txReceipt.gasUsed;
    const txFee = gasPrice * gasUsed;

    return balanceAfter + txFee - balanceBefore;
  } else {
    return balanceAfter - balanceBefore;
  }
}
