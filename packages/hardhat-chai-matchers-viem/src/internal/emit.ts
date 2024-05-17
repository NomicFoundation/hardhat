import type { EventFragment, JsonFragment, Interface } from "ethers";
import type { TransactionReceipt, GetContractReturnType, Abi, Log } from "viem";
import type { AssertWithSsfi, Ssfi } from "../utils";

import { AssertionError } from "chai";
import util from "util";

import { buildAssert } from "../utils";
import { ASSERTION_ABORTED, EMIT_MATCHER } from "./constants";
import { HardhatChaiMatchersAssertionError } from "./errors";
import {
  assertArgsArraysEqual,
  assertIsNotNull,
  preventAsyncMatcherChaining,
  getTransactionReceipt,
} from "./utils";

export const EMIT_CALLED = "emitAssertionCalled";

async function waitForPendingTransaction(
  tx: Promise<`0x${string}`> | `0x${string}`
) {
  let hash: `0x${string}`;
  if (tx instanceof Promise) {
    hash = await tx;
  } else if (typeof tx === "string") {
    hash = tx;
  } else {
    throw new Error(`${JSON.stringify(tx)} is not a valid transaction`);
  }
  return getTransactionReceipt(hash);
}

type Contract = GetContractReturnType<Abi>;

export function supportEmit(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
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

      const onSuccess = async (receipt: TransactionReceipt) => {
        // abort if the assertion chain was aborted, for example because
        // a `.not` was combined with a `.withArgs`
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onSuccess);

        const { ethers } = await import("ethers");
        const iface = new ethers.Interface(contract.abi as JsonFragment[]);
        let eventFragment: EventFragment | null = null;
        try {
          eventFragment = iface.getEvent(eventName);
        } catch (e) {
          // ignore error
        }

        if (eventFragment === null) {
          throw new AssertionError(
            `Event "${eventName}" doesn't exist in the contract`
          );
        }

        const topic = eventFragment.topicHash;
        const contractAddress = contract.address;
        if (typeof contractAddress !== "string") {
          throw new HardhatChaiMatchersAssertionError(
            `The contract address should be a string`
          );
        }

        if (args.length > 0) {
          throw new Error(
            "`.emit` expects only two arguments: the contract and the event name. Arguments should be asserted with the `.withArgs` helper."
          );
        }

        this.logs = receipt.logs
          .filter((log) => (log.topics as string[]).includes(topic))
          .filter(
            (log) => log.address.toLowerCase() === contractAddress.toLowerCase()
          );

        assert(
          this.logs.length > 0,
          `Expected event "${eventName}" to be emitted, but it wasn't`,
          `Expected event "${eventName}" NOT to be emitted, but it was`
        );
        chaiUtils.flag(this, "eventName", eventName);
        chaiUtils.flag(this, "iface", iface);
      };

      const derivedPromise = promise.then(() => {
        // abort if the assertion chain was aborted, for example because
        // a `.not` was combined with a `.withArgs`
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        return waitForPendingTransaction(tx).then((receipt) => {
          assertIsNotNull(receipt, "receipt");
          return onSuccess(receipt);
        });
      });

      chaiUtils.flag(this, EMIT_CALLED, true);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      return this;
    }
  );
}

export async function emitWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  ssfi: Ssfi
) {
  const negated = false; // .withArgs cannot be negated
  const assert = buildAssert(negated, ssfi);

  tryAssertArgsArraysEqual(
    context,
    Assertion,
    chaiUtils,
    expectedArgs,
    context.logs,
    assert,
    ssfi
  );
}

const tryAssertArgsArraysEqual = (
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  logs: Log[],
  assert: AssertWithSsfi,
  ssfi: Ssfi
) => {
  const eventName: string = chaiUtils.flag(context, "eventName");
  const iface: Interface = chaiUtils.flag(context, "iface");
  if (logs.length === 1) {
    const parsedLog = iface.parseLog(logs[0]);
    assertIsNotNull(parsedLog, "parsedLog");

    return assertArgsArraysEqual(
      Assertion,
      expectedArgs,
      parsedLog.args,
      `"${eventName}" event`,
      "event",
      assert,
      ssfi
    );
  }
  for (const log of logs) {
    const parsedLog = iface.parseLog(log);
    assertIsNotNull(parsedLog, "parsedLog");
    try {
      // assert and return if successful, otherwise keep looping
      assertArgsArraysEqual(
        Assertion,
        expectedArgs,
        parsedLog.args,
        `"${eventName}" event`,
        "event",
        assert,
        ssfi
      );
      return;
    } catch {}
  }

  assert(
    false,
    `The specified arguments (${util.inspect(
      expectedArgs
    )}) were not included in any of the ${
      logs.length
    } emitted "${eventName}" events`
  );
};
