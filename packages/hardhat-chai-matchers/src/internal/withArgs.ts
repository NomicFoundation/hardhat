import type EthersT from "ethers";
import { AssertionError } from "chai";

import { isBigNumber, normalizeToBigInt } from "hardhat/common";
import ordinal from "ordinal";
import { AssertWithSsfi, Ssfi } from "../utils";
import { ASSERTION_ABORTED } from "./constants";

import { emitWithArgs, EMIT_CALLED } from "./emit";
import {
  revertedWithCustomErrorWithArgs,
  REVERTED_WITH_CUSTOM_ERROR_CALLED,
} from "./reverted/revertedWithCustomError";

import { assertIsNotNull } from "./utils";

type Interface = EthersT.Interface;

/**
 * A predicate for use with .withArgs(...), to induce chai to accept any value
 * as a positive match with the argument.
 *
 * Example: expect(contract.emitInt()).to.emit(contract, "Int").withArgs(anyValue)
 */
export function anyValue(): boolean {
  return true;
}

/**
 * A predicate for use with .withArgs(...), to induce chai to accept any
 * unsigned integer as a positive match with the argument.
 *
 * Example: expect(contract.emitUint()).to.emit(contract, "Uint").withArgs(anyUint)
 */
export function anyUint(i: any): boolean {
  if (typeof i === "number") {
    if (i < 0) {
      throw new AssertionError(
        `anyUint expected its argument to be an unsigned integer, but it was negative, with value ${i}`
      );
    }
    return true;
  } else if (isBigNumber(i)) {
    const bigInt = normalizeToBigInt(i);
    if (bigInt < 0) {
      throw new AssertionError(
        `anyUint expected its argument to be an unsigned integer, but it was negative, with value ${bigInt}`
      );
    }
    return true;
  }
  throw new AssertionError(
    `anyUint expected its argument to be an integer, but its type was '${typeof i}'`
  );
}

export function supportWithArgs(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod("withArgs", function (this: any, ...expectedArgs: any[]) {
    const { emitCalled } = validateInput.call(this, chaiUtils);

    const { isAddressable } = require("ethers") as typeof EthersT;

    // Resolve arguments to their canonical form:
    // - Addressable → address
    const resolveArgument = (arg: any) =>
      isAddressable(arg) ? arg.getAddress() : arg;

    const onSuccess = (resolvedExpectedArgs: any[]) => {
      if (emitCalled) {
        return emitWithArgs(
          this,
          Assertion,
          chaiUtils,
          resolvedExpectedArgs,
          onSuccess,
          assertArgsArraysEqual
        );
      } else {
        return revertedWithCustomErrorWithArgs(
          this,
          Assertion,
          chaiUtils,
          resolvedExpectedArgs,
          onSuccess
        );
      }
    };

    const promise = (this.then === undefined ? Promise.resolve() : this)
      .then(() => Promise.all(expectedArgs.map(resolveArgument)))
      .then(onSuccess);

    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
    return this;
  });
}

function validateInput(
  this: any,
  chaiUtils: Chai.ChaiUtils
): { emitCalled: boolean } {
  try {
    if (Boolean(this.__flags.negate)) {
      throw new Error("Do not combine .not. with .withArgs()");
    }

    const emitCalled = chaiUtils.flag(this, EMIT_CALLED) === true;
    const revertedWithCustomErrorCalled =
      chaiUtils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED) === true;

    if (!emitCalled && !revertedWithCustomErrorCalled) {
      throw new Error(
        "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion"
      );
    }
    if (emitCalled && revertedWithCustomErrorCalled) {
      throw new Error(
        "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined"
      );
    }

    return { emitCalled };
  } catch (e) {
    // signal that validation failed to allow the matchers to finish early
    chaiUtils.flag(this, ASSERTION_ABORTED, true);

    // discard subject since it could potentially be a rejected promise
    Promise.resolve(this._obj).catch(() => {});

    throw e;
  }
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
  for (const [index, expectedArg] of expectedArgs.entries()) {
    const actualArg = actualArgs[index];
    if (typeof expectedArg === "function") {
      const errorPrefix = `The predicate for the ${ordinal(
        index + 1
      )} event argument`;
      try {
        if (expectedArg(actualArg) === true) continue;
      } catch (e: any) {
        assert(
          false,
          `${errorPrefix} threw when called: ${e.message}`
          // no need for a negated message, since we disallow mixing .not. with
          // .withArgs
        );
      }
      assert(
        false,
        `${errorPrefix} did not return true `
        // no need for a negated message, since we disallow mixing .not. with
        // .withArgs
      );
    } else if (expectedArg instanceof Uint8Array) {
      new Assertion(actualArg, undefined, ssfi, true).equal(
        ethers.hexlify(expectedArg)
      );
    } else if (
      expectedArg?.length !== undefined &&
      typeof expectedArg !== "string"
    ) {
      const expectedLength = expectedArg.length;
      const actualLength = actualArg.length;
      assert(
        expectedLength === actualLength,
        `Expected the ${ordinal(
          index + 1
        )} argument of the "${eventName}" event to have ${expectedLength} ${
          expectedLength === 1 ? "element" : "elements"
        }, but it has ${actualLength}`
      );

      for (let j = 0; j < expectedArg.length; j++) {
        new Assertion(actualArg[j], undefined, ssfi, true).equal(
          expectedArg[j]
        );
      }
    } else {
      if (actualArg.hash !== undefined && actualArg._isIndexed === true) {
        new Assertion(actualArg.hash, undefined, ssfi, true).to.not.equal(
          expectedArg,
          "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead."
        );
        const expectedArgBytes = ethers.isHexString(expectedArg)
          ? ethers.getBytes(expectedArg)
          : ethers.toUtf8Bytes(expectedArg);
        const expectedHash = ethers.keccak256(expectedArgBytes);
        new Assertion(actualArg.hash, undefined, ssfi, true).to.equal(
          expectedHash,
          `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${expectedHash}. The actual hash and the expected hash did not match`
        );
      } else {
        new Assertion(actualArg, undefined, ssfi, true).equal(expectedArg);
      }
    }
  }
}
