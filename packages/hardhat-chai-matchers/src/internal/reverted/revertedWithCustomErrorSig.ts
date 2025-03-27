import type EthersT from "ethers";
import { Interface } from "ethers";

import {
  ASSERTION_ABORTED,
  REVERTED_WITH_CUSTOM_ERROR_SIG_MATCHER,
} from "../constants";
import {
  assertArgsArraysEqual,
  assertIsNotNull,
  preventAsyncMatcherChaining,
} from "../utils";
import { buildAssert, Ssfi } from "../../utils";
import {
  decodeReturnData,
  getReturnDataFromError,
  resultToArray,
} from "./utils";

export const REVERTED_WITH_CUSTOM_ERROR_CALLED = "customErrorAssertionCalled";

interface CustomErrorAssertionData {
  contractInterface: EthersT.Interface;
  returnData: string;
  customError: EthersT.ErrorFragment;
}

export function supportRevertedWithCustomErrorSig(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    REVERTED_WITH_CUSTOM_ERROR_SIG_MATCHER,
    function (this: any, expectedCustomErrorSig: string, ...args: any[]) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      const { iface, expectedCustomError } = validateInput(
        this._obj,
        expectedCustomErrorSig,
        args
      );

      preventAsyncMatcherChaining(
        this,
        REVERTED_WITH_CUSTOM_ERROR_SIG_MATCHER,
        chaiUtils
      );

      const onSuccess = () => {
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it didn't revert`
        );
      };

      const onError = (error: any) => {
        if (chaiUtils.flag(this, ASSERTION_ABORTED) === true) {
          return;
        }

        const { toBeHex } = require("ethers") as typeof EthersT;

        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData.kind === "Empty") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it reverted without a reason`
          );
        } else if (decodedReturnData.kind === "Error") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it reverted with reason '${decodedReturnData.reason}'`
          );
        } else if (decodedReturnData.kind === "Panic") {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it reverted with panic code ${toBeHex(
              decodedReturnData.code
            )} (${decodedReturnData.description})`
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
              `Expected transaction NOT to be reverted with custom error '${expectedCustomErrorSig}', but it was`
            );
          } else {
            // try to decode the actual custom error
            // this will only work when the error comes from the given contract
            const actualCustomError = iface.getError(decodedReturnData.id);

            if (actualCustomError === null) {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it reverted with a different custom error`
              );
            } else {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorSig}', but it reverted with custom error '${actualCustomError.name}'`
              );
            }
          }
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError
      );

      // needed for .withArgs
      chaiUtils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED, true);
      this.promise = derivedPromise;

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}

function validateInput(
  obj: any,
  expectedCustomErrorSig: string,
  args: any[]
): { iface: EthersT.Interface; expectedCustomError: EthersT.ErrorFragment } {
  try {
    // validate custom error name
    if (typeof expectedCustomErrorSig !== "string") {
      throw new TypeError("Expected the custom error name to be a string");
    }

    if (expectedCustomErrorSig.match(/[$\w]*\(.*\)/) !== null) {
      throw new Error("The custom error signature is not formatted properly");
    }

    const iface = new Interface([`error ${expectedCustomErrorSig}`]);
    const expectedCustomError = iface.getError(expectedCustomErrorSig);

    // check that interface contains the given custom error
    if (expectedCustomError === null) {
      throw new Error(
        `Error processing error signature '${expectedCustomErrorSig}'`
      );
    }

    if (args.length > 0) {
      throw new Error(
        "`.revertedWithCustomErrorSig` expects only one argument: the error signature. Arguments should be asserted with the `.withArgs` helper."
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

export async function revertedWithCustomErrorSigWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
  expectedArgs: any[],
  ssfi: Ssfi
) {
  const negated = false; // .withArgs cannot be negated
  const assert = buildAssert(negated, ssfi);

  const customErrorAssertionData: CustomErrorAssertionData =
    context.customErrorData;

  if (customErrorAssertionData === undefined) {
    throw new Error(
      "[.withArgs] should never happen, please submit an issue to the Hardhat repository"
    );
  }

  const { contractInterface, customError, returnData } =
    customErrorAssertionData;

  const errorFragment = contractInterface.getError(customError.name);
  assertIsNotNull(errorFragment, "errorFragment");
  // We transform ether's Array-like object into an actual array as it's safer
  const actualArgs = resultToArray(
    contractInterface.decodeErrorResult(errorFragment, returnData)
  );

  assertArgsArraysEqual(
    Assertion,
    expectedArgs,
    actualArgs,
    `"${customError.name}" custom error`,
    "error",
    assert,
    ssfi
  );
}
