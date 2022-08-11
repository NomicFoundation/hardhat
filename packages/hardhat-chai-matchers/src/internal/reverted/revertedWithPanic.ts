import type { BigNumber } from "ethers";

import { normalizeToBigInt } from "hardhat/common";

import { buildAssert } from "../../utils";
import { panicErrorCodeToReason } from "./panic";
import { decodeReturnData, getReturnDataFromError } from "./utils";

export function supportRevertedWithPanic(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "revertedWithPanic",
    function (this: any, expectedCodeArg: any) {
      const ethers = require("ethers");

      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let expectedCode: BigNumber | undefined;
      try {
        if (expectedCodeArg !== undefined) {
          const normalizedCode = normalizeToBigInt(expectedCodeArg);
          expectedCode = ethers.BigNumber.from(normalizedCode);
        }
      } catch {
        throw new TypeError(
          `Expected the given panic code to be a number-like value, but got '${expectedCodeArg}'`
        );
      }

      const code: number | undefined = expectedCode as any;

      let description: string | undefined;
      let formattedPanicCode: string;
      if (code === undefined) {
        formattedPanicCode = "some panic code";
      } else {
        const codeBN = ethers.BigNumber.from(code);
        description = panicErrorCodeToReason(codeBN) ?? "unknown panic code";
        formattedPanicCode = `panic code ${codeBN.toHexString()} (${description})`;
      }

      const onSuccess = () => {
        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with ${formattedPanicCode}, but it didn't revert`
        );
      };

      const onError = (error: any) => {
        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData.kind === "Empty") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted without a reason`
          );
        } else if (decodedReturnData.kind === "Error") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with reason '${decodedReturnData.reason}'`
          );
        } else if (decodedReturnData.kind === "Panic") {
          if (code !== undefined) {
            assert(
              decodedReturnData.code.eq(code),
              `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
                decodedReturnData.description
              })`,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it was`
            );
          } else {
            assert(
              true,
              undefined,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
                decodedReturnData.description
              })`
            );
          }
        } else if (decodedReturnData.kind === "Custom") {
          assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with a custom error`
          );
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError
      );

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}
