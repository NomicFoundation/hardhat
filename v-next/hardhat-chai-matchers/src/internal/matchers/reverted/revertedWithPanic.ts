import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { toBigInt } from "@ignored/hardhat-vnext-utils/bigint";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { REVERTED_WITH_PANIC_MATCHER } from "../../constants.js";
import { buildAssert } from "../../utils/build-assert.js";
import { preventAsyncMatcherChaining } from "../../utils/prevent-chaining.js";

import { panicErrorCodeToReason } from "./panic.js";
import { decodeReturnData, getReturnDataFromError } from "./utils.js";

export function supportRevertedWithPanic(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    REVERTED_WITH_PANIC_MATCHER,
    function (this: any, expectedCodeArg: any) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let expectedCode: bigint | undefined;
      try {
        if (expectedCodeArg !== undefined) {
          expectedCode = toBigInt(expectedCodeArg);
        }
      } catch {
        // if the input validation fails, we discard the subject since it could
        // potentially be a rejected promise
        Promise.resolve(this._obj).catch(() => {});

        throw new HardhatError(
          HardhatError.ERRORS.CHAI_MATCHERS.PANIC_CODE_EXPECTED,
          {
            panicCode: expectedCodeArg,
          },
        );
      }

      const code: bigint | undefined = expectedCode;

      let description: string | undefined;
      let formattedPanicCode: string;
      if (code === undefined) {
        formattedPanicCode = "some panic code";
      } else {
        const codeBN = toBigInt(code);
        description = panicErrorCodeToReason(codeBN) ?? "unknown panic code";
        formattedPanicCode = `panic code ${numberToHexString(codeBN)} (${description})`;
      }

      preventAsyncMatcherChaining(this, REVERTED_WITH_PANIC_MATCHER, chaiUtils);

      const onSuccess = () => {
        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with ${formattedPanicCode}, but it didn't revert`,
        );
      };

      const onError = (error: any) => {
        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData.kind === "Empty") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted without a reason`,
          );
        } else if (decodedReturnData.kind === "Error") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with reason '${decodedReturnData.reason}'`,
          );
        } else if (decodedReturnData.kind === "Panic") {
          if (code !== undefined) {
            assert(
              decodedReturnData.code === code,
              `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with panic code ${numberToHexString(
                decodedReturnData.code,
              )} (${decodedReturnData.description})`,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it was`,
            );
          } else {
            assert(
              true,
              undefined,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it reverted with panic code ${numberToHexString(
                decodedReturnData.code,
              )} (${decodedReturnData.description})`,
            );
          }
        } else if (decodedReturnData.kind === "Custom") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with a custom error`,
          );
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError,
      );

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    },
  );
}
