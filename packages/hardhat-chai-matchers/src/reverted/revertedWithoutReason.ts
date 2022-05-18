import { decodeReturnData, getReturnDataFromError } from "./utils";

export function supportRevertedWithoutReason(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod("revertedWithoutReason", function (this: any) {
    const onSuccess = () => {
      this.assert(
        false,
        `Expected transaction to be reverted without a reason, but it didn't revert`
      );
    };

    const onError = (error: any) => {
      const returnData = getReturnDataFromError(error);
      const decodedReturnData = decodeReturnData(returnData);

      if (decodedReturnData.kind === "Error") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason, but it reverted with reason '${decodedReturnData.reason}'`
        );
      } else if (decodedReturnData.kind === "Empty") {
        this.assert(
          true,
          null,
          "Expected transaction NOT to be reverted without a reason, but it was"
        );
      } else if (decodedReturnData.kind === "Panic") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
            decodedReturnData.description
          })`
        );
      } else if (decodedReturnData.kind === "Custom") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason, but it reverted with a custom error`
        );
      } else {
        const _exhaustiveCheck: never = decodedReturnData;
      }
    };

    const derivedPromise = Promise.resolve(this._obj).then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });
}
