import type { AssertWithSsfi, Ssfi } from "../utils/ssfi.js";
import type { EventFragment } from "ethers/abi";
import type { Contract } from "ethers/contract";
import type { Provider, TransactionReceipt } from "ethers/providers";
import type { Transaction } from "ethers/transaction";

import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { AssertionError } from "chai";

import { ASSERTION_ABORTED, EMIT_MATCHER } from "../constants.js";
import { assertArgsArraysEqual, assertIsNotNull } from "../utils/asserts.js";
import { buildAssert } from "../utils/build-assert.js";
import { preventAsyncMatcherChaining } from "../utils/prevent-chaining.js";

export const EMIT_CALLED = "emitAssertionCalled";

async function waitForPendingTransaction(
  tx: Promise<Transaction> | Transaction | string,
  provider: Provider,
) {
  let hash: string | null;
  if (tx instanceof Promise) {
    ({ hash } = await tx);
  } else if (typeof tx === "string") {
    hash = tx;
  } else {
    ({ hash } = tx);
  }

  if (hash === null) {
    throw new HardhatError(
      HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.INVALID_TRANSACTION,
      { transaction: JSON.stringify(tx) },
    );
  }

  return provider.getTransactionReceipt(hash);
}

export function supportEmit(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    EMIT_MATCHER,
    function (
      this: any,
      contract: Contract,
      eventName: string,
      ...args: any[]
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;
      const tx = this._obj;

      preventAsyncMatcherChaining(this, EMIT_MATCHER, chaiUtils, true);

      const promise = this.then === undefined ? Promise.resolve() : this;

      const onSuccess = (receipt: TransactionReceipt) => {
        // abort if the assertion chain was aborted, for example because
        // a `.not` was combined with a `.withArgs`
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onSuccess);

        let eventFragment: EventFragment | null = null;
        try {
          eventFragment = contract.interface.getEvent(eventName, []);
        } catch (e) {
          if (e instanceof TypeError) {
            const errorMessage = e.message.split(" (argument=")[0];
            // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
            throw new AssertionError(errorMessage);
          }
        }

        if (eventFragment === null) {
          // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
          throw new AssertionError(
            `Event "${eventName}" doesn't exist in the contract`,
          );
        }

        const topic = eventFragment.topicHash;
        const contractAddress = contract.target;
        if (typeof contractAddress !== "string") {
          throw new HardhatError(
            HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.CONTRACT_TARGET_MUST_BE_A_STRING,
          );
        }

        if (args.length > 0) {
          throw new HardhatError(
            HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.EMIT_EXPECTS_TWO_ARGUMENTS,
          );
        }

        this.logs = receipt.logs
          .filter((log) => log.topics.includes(topic))
          .filter(
            (log) =>
              log.address.toLowerCase() === contractAddress.toLowerCase(),
          );

        assert(
          this.logs.length > 0,
          `Expected event "${eventName}" to be emitted, but it wasn't`,
          `Expected event "${eventName}" NOT to be emitted, but it was`,
        );
        chaiUtils.flag(this, "eventName", eventName);
        chaiUtils.flag(this, "contract", contract);
      };

      const derivedPromise = promise.then(() => {
        // abort if the assertion chain was aborted, for example because
        // a `.not` was combined with a `.withArgs`
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        if (contract.runner === null || contract.runner.provider === null) {
          throw new HardhatError(
            HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.CONTRACT_RUNNER_PROVIDER_NOT_NULL,
          );
        }

        return waitForPendingTransaction(tx, contract.runner.provider).then(
          (receipt) => {
            assertIsNotNull(receipt, "receipt");
            return onSuccess(receipt);
          },
        );
      });

      chaiUtils.flag(this, EMIT_CALLED, true);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    },
  );
}

export async function emitWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  ssfi: Ssfi,
): Promise<void> {
  const negated = false; // .withArgs cannot be negated
  const assert = buildAssert(negated, ssfi);

  tryAssertArgsArraysEqual(
    context,
    Assertion,
    chaiUtils,
    expectedArgs,
    context.logs,
    assert,
    ssfi,
  );
}

const tryAssertArgsArraysEqual = (
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  logs: any[],
  assert: AssertWithSsfi,
  ssfi: Ssfi,
) => {
  const eventName = chaiUtils.flag(context, "eventName");

  if (logs.length === 1) {
    const parsedLog = chaiUtils
      .flag(context, "contract")
      .interface.parseLog(logs[0]);
    assertIsNotNull(parsedLog, "parsedLog");

    return assertArgsArraysEqual(
      Assertion,
      expectedArgs,
      parsedLog.args,
      `"${eventName}" event`,
      "event",
      assert,
      ssfi,
    );
  }

  for (const index in logs) {
    if (index === undefined) {
      break;
    } else {
      try {
        const parsedLog = chaiUtils
          .flag(context, "contract")
          .interface.parseLog(logs[index]);
        assertIsNotNull(parsedLog, "parsedLog");

        assertArgsArraysEqual(
          Assertion,
          expectedArgs,
          parsedLog.args,
          `"${eventName}" event`,
          "event",
          assert,
          ssfi,
        );

        return;
      } catch {}
    }
  }

  assert(
    false,
    `The specified arguments (${util.inspect(
      expectedArgs,
    )}) were not included in any of the ${
      context.logs.length
    } emitted "${eventName}" events`,
  );
};
