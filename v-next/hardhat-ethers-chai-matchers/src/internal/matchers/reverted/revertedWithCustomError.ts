import type { Ssfi } from "../../utils/ssfi.js";
import type { ErrorFragment, Interface } from "ethers/abi";
import type { BaseContract } from "ethers/contract";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { assert as chaiAssert } from "chai";

import {
  ASSERTION_ABORTED,
  REVERTED_WITH_CUSTOM_ERROR_MATCHER,
} from "../../constants.js";
import { assertArgsArraysEqual, assertIsNotNull } from "../../utils/asserts.js";
import { buildAssert } from "../../utils/build-assert.js";
import { preventAsyncMatcherChaining } from "../../utils/prevent-chaining.js";

import {
  decodeReturnData,
  getReturnDataFromError,
  resultToArray,
} from "./utils.js";

export const REVERTED_WITH_CUSTOM_ERROR_CALLED = "customErrorAssertionCalled";

interface CustomErrorAssertionData {
  contractInterface: Interface;
  returnData: string;
  customError: ErrorFragment;
}

export function supportRevertedWithCustomError(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    REVERTED_WITH_CUSTOM_ERROR_MATCHER,
    function (
      this: any,
      contract: BaseContract,
      expectedCustomErrorName: string,
      ...args: any[]
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      const { iface, expectedCustomError } = validateInput(
        this._obj,
        contract,
        expectedCustomErrorName,
        args,
      );

      preventAsyncMatcherChaining(
        this,
        REVERTED_WITH_CUSTOM_ERROR_MATCHER,
        chaiUtils,
      );

      const onSuccess = () => {
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it didn't revert`,
        );
      };

      const onError = (error: any) => {
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData.kind === "Empty") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted without a reason`,
          );
        } else if (decodedReturnData.kind === "Error") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with reason '${decodedReturnData.reason}'`,
          );
        } else if (decodedReturnData.kind === "Panic") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with panic code ${numberToHexString(
              decodedReturnData.code,
            )} (${decodedReturnData.description})`,
          );
        } else if (decodedReturnData.kind === "Custom") {
          if (decodedReturnData.id === expectedCustomError.selector) {
            // add flag with the data needed for .withArgs
            const customErrorAssertionData: CustomErrorAssertionData = {
              contractInterface: iface,
              customError: expectedCustomError,
              returnData,
            };
            this.customErrorData = customErrorAssertionData;

            assert(
              true,
              undefined,
              `Expected transaction NOT to be reverted with custom error '${expectedCustomErrorName}', but it was`,
            );
          } else {
            // try to decode the actual custom error
            // this will only work when the error comes from the given contract
            const actualCustomError = iface.getError(decodedReturnData.id);

            if (actualCustomError === null) {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with a different custom error`,
              );
            } else {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with custom error '${actualCustomError.name}'`,
              );
            }
          }
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError,
      );

      // needed for .withArgs
      chaiUtils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED, true);
      this.promise = derivedPromise;

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    },
  );
}

function validateInput(
  obj: any,
  contract: BaseContract,
  expectedCustomErrorName: string,
  args: any[],
): { iface: Interface; expectedCustomError: ErrorFragment } {
  try {
    // check the case where users forget to pass the contract as the first
    // argument
    if (typeof contract === "string" || contract?.interface === undefined) {
      // discard subject since it could potentially be a rejected promise
      chaiAssert.fail(
        "The first argument of .revertedWithCustomError must be the contract that defines the custom error",
      );
    }

    // validate custom error name
    if (typeof expectedCustomErrorName !== "string") {
      chaiAssert.fail("Expected the custom error name to be a string");
    }

    const iface = contract.interface;
    const expectedCustomError = iface.getError(expectedCustomErrorName);

    // check that interface contains the given custom error
    if (expectedCustomError === null) {
      chaiAssert.fail(
        `The given contract doesn't have a custom error named "${expectedCustomErrorName}"`,
      );
    }

    if (args.length > 0) {
      chaiAssert.fail(
        "The .revertedWithCustomError matcher expects two arguments: the contract and the custom error name. Arguments should be asserted with the .withArgs helper.",
      );
    }

    return { iface, expectedCustomError };
  } catch (e) {
    // if the input validation fails, we discard the subject since it could
    // potentially be a rejected promise
    Promise.resolve(obj).catch(() => {});
    throw e;
  }
}

export async function revertedWithCustomErrorWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  _chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  ssfi: Ssfi,
): Promise<void> {
  const negated = false; // .withArgs cannot be negated
  const assert = buildAssert(negated, ssfi);

  const customErrorAssertionData: CustomErrorAssertionData =
    context.customErrorData;

  if (customErrorAssertionData === undefined) {
    chaiAssert.fail(
      "[.withArgs] should never happen, please submit an issue to the Hardhat repository",
    );
  }

  const { contractInterface, customError, returnData } =
    customErrorAssertionData;

  const errorFragment = contractInterface.getError(customError.name);

  assertIsNotNull(
    errorFragment,
    "Error type can't be found in the contract's interface",
  );

  // We transform ether's Array-like object into an actual array as it's safer
  const actualArgs = resultToArray(
    contractInterface.decodeErrorResult(errorFragment, returnData),
  );

  assertArgsArraysEqual(
    Assertion,
    expectedArgs,
    actualArgs,
    `"${customError.name}" custom error`,
    "error",
    assert,
    ssfi,
  );
}
