import { panicErrorCodeToReason } from "./panic";
import { decodeReturnData, getReturnDataFromError } from "./utils";

export function supportRevertedWithPanic(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "revertedWithPanic",
    function (this: any, expectedCode: unknown) {
      const ethers = require("ethers");

      // validate expected code
      if (
        expectedCode !== undefined &&
        typeof expectedCode !== "number" &&
        !ethers.BigNumber.isBigNumber(expectedCode)
      ) {
        throw new TypeError(
          "Expected a number or BigNumber as the expected panic code"
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
        this.assert(
          false,
          `Expected transaction to be reverted with ${formattedPanicCode}, but it didn't revert`
        );
      };

      const onError = (error: any) => {
        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData === null) {
          this.assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with an unknown reason`
          );
        } else if (decodedReturnData.kind === "Empty") {
          this.assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted without a reason string`
          );
        } else if (decodedReturnData.kind === "Error") {
          this.assert(
            false,
            `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with reason '${decodedReturnData.reason}'`
          );
        } else if (decodedReturnData.kind === "Panic") {
          if (code !== undefined) {
            this.assert(
              decodedReturnData.code.eq(code),
              `Expected transaction to be reverted with ${formattedPanicCode}, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
                decodedReturnData.description
              })`,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it did`
            );
          } else {
            this.assert(
              true,
              null,
              `Expected transaction NOT to be reverted with ${formattedPanicCode}, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
                decodedReturnData.description
              })`
            );
          }
        } else if (decodedReturnData.kind === "Custom") {
          this.assert(
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
