import { decodeReturnData, getReturnDataFromError } from "./utils";

export function supportReverted(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty("reverted", function (this: any) {
    const subject: unknown = this._obj;

    // Check if the received value can be linked to a transaction, and then
    // get the receipt of that transaction and check its status.
    //
    // If the value doesn't correspond to a transaction, then the `reverted`
    // assertion is false.
    const onSuccess = (value: unknown) => {
      if (isTransactionResponse(value) || typeof value === "string") {
        const hash = typeof value === "string" ? value : value.hash;

        if (!isValidTransactionHash(hash)) {
          throw new TypeError(
            `Expected a valid transaction hash, but got '${hash}'`
          );
        }

        return getTransactionReceipt(hash).then((receipt) => {
          this.assert(
            receipt.status === 0,
            "Expected transaction to be reverted",
            "Expected transaction NOT to be reverted"
          );
        });
      } else if (isTransactionReceipt(value)) {
        const receipt = value;

        this.assert(
          receipt.status === 0,
          "Expected transaction to be reverted",
          "Expected transaction NOT to be reverted"
        );
      } else {
        // If the subject of the assertion is not connected to a transaction
        // (hash, receipt, etc.), then the assertion fails.
        // Since we use `false` here, this means that `.not.to.be.reverted`
        // assertions will pass instead of always throwing a validation error.
        // This allows users to do things like:
        //   `expect(c.callStatic.f()).to.not.be.reverted`
        this.assert(false, "Expected transaction to be reverted");
      }
    };

    const onError = (error: any) => {
      const returnData = getReturnDataFromError(error);
      const decodedReturnData = decodeReturnData(returnData);

      if (
        decodedReturnData.kind === "Empty" ||
        decodedReturnData.kind === "Custom"
      ) {
        // in the negated case, if we can't decode the reason, we just indicate
        // that the transaction didn't revert
        this.assert(true, null, `Expected transaction NOT to be reverted`);
      } else if (decodedReturnData.kind === "Error") {
        this.assert(
          true,
          null,
          `Expected transaction NOT to be reverted, but it reverted with reason '${decodedReturnData.reason}'`
        );
      } else if (decodedReturnData.kind === "Panic") {
        this.assert(
          true,
          null,
          `Expected transaction NOT to be reverted, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
            decodedReturnData.description
          })`
        );
      } else {
        const _exhaustiveCheck: never = decodedReturnData;
      }
    };

    // we use `Promise.resolve(subject)` so we can process both values and
    // promises of values in the same way
    const derivedPromise = Promise.resolve(subject).then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });
}

async function getTransactionReceipt(hash: string) {
  const hre = await import("hardhat");

  return hre.ethers.provider.getTransactionReceipt(hash);
}

function isTransactionResponse(x: unknown): x is { hash: string } {
  if (typeof x === "object" && x !== null) {
    return "hash" in x;
  }

  return false;
}

function isTransactionReceipt(x: unknown): x is { status: number } {
  if (typeof x === "object" && x !== null && "status" in x) {
    const status = (x as any).status;

    // this means we only support ethers's receipts for now; adding support for
    // raw receipts, where the status is an hexadecimal string, should be easy
    // and we can do it if there's demand for that
    return typeof status === "number";
  }

  return false;
}

function isValidTransactionHash(x: string): boolean {
  return /0x[0-9a-fA-F]{64}/.test(x);
}
