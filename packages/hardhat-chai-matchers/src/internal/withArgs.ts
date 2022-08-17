import { AssertionError } from "chai";

import { isBigNumber, normalizeToBigInt } from "hardhat/common";

import { emitWithArgs, EMIT_CALLED } from "./emit";
import {
  revertedWithCustomErrorWithArgs,
  REVERTED_WITH_CUSTOM_ERROR_CALLED,
} from "./reverted/revertedWithCustomError";

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
  utils: Chai.ChaiUtils
) {
  Assertion.addMethod("withArgs", function (this: any, ...expectedArgs: any[]) {
    if (this.__flags.negate) {
      throw new Error("Do not combine .not. with .withArgs()");
    }

    const emitCalled = utils.flag(this, EMIT_CALLED) === true;
    const revertedWithCustomErrorCalled =
      utils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED) === true;

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

    const promise = this.then === undefined ? Promise.resolve() : this;

    const onSuccess = () => {
      if (emitCalled) {
        return emitWithArgs(this, Assertion, utils, expectedArgs, onSuccess);
      } else {
        return revertedWithCustomErrorWithArgs(
          this,
          Assertion,
          utils,
          expectedArgs,
          onSuccess
        );
      }
    };

    const derivedPromise = promise.then(onSuccess);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    return this;
  });
}
