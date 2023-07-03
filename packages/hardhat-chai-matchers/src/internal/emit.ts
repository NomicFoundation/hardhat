import type EthersT from "ethers";
import type { Contract, Transaction } from "ethers";
import { AssertionError } from "chai";
import util from "util";
import ordinal from "ordinal";

import { AssertWithSsfi, buildAssert, Ssfi } from "../utils";
import { ASSERTION_ABORTED } from "./constants";
import { assertIsNotNull } from "./utils";
import { HardhatChaiMatchersAssertionError } from "./errors";

type EventFragment = EthersT.EventFragment;
type Interface = EthersT.Interface;
type Provider = EthersT.Provider;

export const EMIT_CALLED = "emitAssertionCalled";

async function waitForPendingTransaction(
  tx: Promise<Transaction> | Transaction | string,
  provider: Provider
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
    throw new Error(`${JSON.stringify(tx)} is not a valid transaction`);
  }
  return provider.getTransactionReceipt(hash);
}

export function supportEmit(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    "emit",
    function (this: any, contract: Contract, eventName: string) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;
      const tx = this._obj;

      const promise = this.then === undefined ? Promise.resolve() : this;

      const onSuccess = (receipt: EthersT.TransactionReceipt) => {
        // abort if the assertion chain was aborted, for example because
        // a `.not` was combined with a `.withArgs`
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onSuccess);

        let eventFragment: EventFragment | null = null;
        try {
          eventFragment = contract.interface.getEvent(eventName);
        } catch (e) {
          // ignore error
        }

        if (eventFragment === null) {
          throw new AssertionError(
            `Event "${eventName}" doesn't exist in the contract`
          );
        }

        const topic = eventFragment.topicHash;
        const contractAddress = contract.target;
        if (typeof contractAddress !== "string") {
          throw new HardhatChaiMatchersAssertionError(
            `The contract target should be a string`
          );
        }
        this.logs = receipt.logs
          .filter((log) => log.topics.includes(topic))
          .filter(
            (log) => log.address.toLowerCase() === contractAddress.toLowerCase()
          );

        assert(
          this.logs.length > 0,
          `Expected event "${eventName}" to be emitted, but it wasn't`,
          `Expected event "${eventName}" NOT to be emitted, but it was`
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
          throw new HardhatChaiMatchersAssertionError(
            "contract.runner.provider shouldn't be null"
          );
        }

        return waitForPendingTransaction(tx, contract.runner.provider).then(
          (receipt) => {
            assertIsNotNull(receipt, "receipt");
            return onSuccess(receipt);
          }
        );
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

function assertArgsArraysEqual(
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  log: any,
  assert: AssertWithSsfi,
  ssfi: Ssfi
) {
  const ethers = require("ethers") as typeof EthersT;
  const parsedLog = (
    chaiUtils.flag(context, "contract").interface as Interface
  ).parseLog(log);
  assertIsNotNull(parsedLog, "parsedLog");
  const actualArgs = parsedLog.args;
  const eventName = chaiUtils.flag(context, "eventName");
  assert(
    actualArgs.length === expectedArgs.length,
    `Expected "${eventName}" event to have ${expectedArgs.length} argument(s), but it has ${actualArgs.length}`
  );
  for (let index = 0; index < expectedArgs.length; index++) {
    if (typeof expectedArgs[index] === "function") {
      const errorPrefix = `The predicate for the ${ordinal(
        index + 1
      )} event argument`;
      try {
        assert(
          expectedArgs[index](actualArgs[index]),
          `${errorPrefix} returned false`
          // no need for a negated message, since we disallow mixing .not. with
          // .withArgs
        );
      } catch (e) {
        if (e instanceof AssertionError) {
          assert(
            false,
            `${errorPrefix} threw an AssertionError: ${e.message}`
            // no need for a negated message, since we disallow mixing .not. with
            // .withArgs
          );
        }
        throw e;
      }
    } else if (expectedArgs[index] instanceof Uint8Array) {
      new Assertion(actualArgs[index], undefined, ssfi, true).equal(
        ethers.hexlify(expectedArgs[index])
      );
    } else if (
      expectedArgs[index]?.length !== undefined &&
      typeof expectedArgs[index] !== "string"
    ) {
      const expectedLength = expectedArgs[index].length;
      const actualLength = actualArgs[index].length;
      assert(
        expectedLength === actualLength,
        `Expected the ${ordinal(
          index + 1
        )} argument of the "${eventName}" event to have ${expectedLength} ${
          expectedLength === 1 ? "element" : "elements"
        }, but it has ${actualLength}`
      );

      for (let j = 0; j < expectedArgs[index].length; j++) {
        new Assertion(actualArgs[index][j], undefined, ssfi, true).equal(
          expectedArgs[index][j]
        );
      }
    } else {
      if (
        actualArgs[index].hash !== undefined &&
        actualArgs[index]._isIndexed === true
      ) {
        new Assertion(
          actualArgs[index].hash,
          undefined,
          ssfi,
          true
        ).to.not.equal(
          expectedArgs[index],
          "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the the actual event argument (the pre-image of the hash) instead."
        );
        const expectedArgBytes = ethers.isHexString(expectedArgs[index])
          ? ethers.getBytes(expectedArgs[index])
          : ethers.toUtf8Bytes(expectedArgs[index]);
        const expectedHash = ethers.keccak256(expectedArgBytes);
        new Assertion(actualArgs[index].hash, undefined, ssfi, true).to.equal(
          expectedHash,
          `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${expectedHash}. The actual hash and the expected hash did not match`
        );
      } else {
        new Assertion(actualArgs[index], undefined, ssfi, true).equal(
          expectedArgs[index]
        );
      }
    }
  }
}

const tryAssertArgsArraysEqual = (
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  logs: any[],
  assert: AssertWithSsfi,
  ssfi: Ssfi
) => {
  if (logs.length === 1)
    return assertArgsArraysEqual(
      context,
      Assertion,
      chaiUtils,
      expectedArgs,
      logs[0],
      assert,
      ssfi
    );
  for (const index in logs) {
    if (index === undefined) {
      break;
    } else {
      try {
        assertArgsArraysEqual(
          context,
          Assertion,
          chaiUtils,
          expectedArgs,
          logs[index],
          assert,
          ssfi
        );
        return;
      } catch {}
    }
  }
  const eventName = chaiUtils.flag(context, "eventName");
  assert(
    false,
    `The specified arguments (${util.inspect(
      expectedArgs
    )}) were not included in any of the ${
      context.logs.length
    } emitted "${eventName}" events`
  );
};
