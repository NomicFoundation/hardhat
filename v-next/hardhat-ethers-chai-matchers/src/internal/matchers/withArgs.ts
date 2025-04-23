import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { AssertionError } from "chai";
import { isAddressable } from "ethers/address";

import { ASSERTION_ABORTED } from "../constants.js";
import { isBigInt } from "../utils/bigint.js";

import { emitWithArgs, EMIT_CALLED } from "./emit.js";
import {
  revertedWithCustomErrorWithArgs,
  REVERTED_WITH_CUSTOM_ERROR_CALLED,
} from "./reverted/revertedWithCustomError.js";

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
      // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
      throw new AssertionError(
        `anyUint expected its argument to be an unsigned integer, but it was negative, with value ${i}`,
      );
    }

    return true;
  } else if (isBigInt(i)) {
    const bigInt = toBigInt(i);

    if (bigInt < 0) {
      // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
      throw new AssertionError(
        `anyUint expected its argument to be an unsigned integer, but it was negative, with value ${bigInt}`,
      );
    }
    return true;
  }

  // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
  throw new AssertionError(
    `anyUint expected its argument to be an integer, but its type was '${typeof i}'`,
  );
}

export function supportWithArgs(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod("withArgs", function (this: any, ...expectedArgs: any[]) {
    const { emitCalled } = validateInput.call(this, chaiUtils);

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
        );
      } else {
        return revertedWithCustomErrorWithArgs(
          this,
          Assertion,
          chaiUtils,
          resolvedExpectedArgs,
          onSuccess,
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
  chaiUtils: Chai.ChaiUtils,
): { emitCalled: boolean } {
  try {
    if (Boolean(this.__flags.negate)) {
      throw new HardhatError(
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.WITH_ARGS_CANNOT_BE_COMBINED_WITH_NOT,
      );
    }

    const emitCalled = chaiUtils.flag(this, EMIT_CALLED) === true;

    const revertedWithCustomErrorCalled =
      chaiUtils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED) === true;

    if (!emitCalled && !revertedWithCustomErrorCalled) {
      throw new HardhatError(
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.WITH_ARGS_WRONG_COMBINATION,
      );
    }

    if (emitCalled && revertedWithCustomErrorCalled) {
      throw new HardhatError(
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.WITH_ARGS_COMBINED_WITH_INCOMPATIBLE_ASSERTIONS,
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
