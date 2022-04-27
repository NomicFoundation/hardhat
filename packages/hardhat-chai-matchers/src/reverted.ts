import { defaultAbiCoder as abi } from "@ethersproject/abi";
import { AssertionError } from "chai";
import { HardhatChaiMatchersDecodingError } from "./errors";

// method id of 'Error(string)'
const ERROR_STRING_PREFIX = "0x08c379a0";

export function supportReverted(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty("reverted", function (this: any) {
    const subject: unknown = this._obj;

    // Check if the received value can be linked to a transaction, and then
    // get the receipt of that transaction and check its status.
    //
    // If the value doesn't correspond to a transaction, then the `reverted`
    // assertions is false.
    const onSuccess = (value: unknown) => {
      if (isTransactionResponse(value) || typeof value === "string") {
        const hash = typeof value === "string" ? value : value.hash;

        if (!isValidTransactionHash(hash)) {
          return Promise.reject(
            new AssertionError(
              `Expected a valid transaction hash, but got '${hash}'`
            )
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
        //   `expect(c.callStatic.f()).to.not.be.reverted
        this.assert(
          false,
          "Expected transaction to be reverted",
          "Expected transaction NOT to be reverted"
        );
      }
    };

    const onError = (error: any) => {
      if (!(error instanceof Error)) {
        throw new AssertionError("Expected an Error object");
      }

      this.assert(
        true,
        "Expected transaction to be reverted",
        "Expected transaction NOT to be reverted"
      );
    };

    // we use `Promise.resolve(subject)` so we can process both values and
    // promises of values in the same way
    const derivedPromise = Promise.resolve(subject).then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });

  Assertion.addMethod("revertedWith", function (expectedReason: unknown) {
    // validate expected reason
    if (typeof expectedReason !== "string") {
      const rejection = Promise.reject(
        new AssertionError("Expected a string as the expected reason string")
      );

      (this as any).then = rejection.then.bind(rejection);
      (this as any).catch = rejection.catch.bind(rejection);

      return this;
    }

    const onSuccess = () => {
      this.assert(
        false,
        `Expected transaction to be reverted with reason '${expectedReason}', but it didn't revert`,
        "Expected transaction NOT to be reverted",
        "Transaction that didn't revert",
        `Transaction that reverts with reason '${expectedReason}'`
      );
    };

    const onError = (error: any) => {
      if (!(error instanceof Error)) {
        throw new AssertionError("Expected an Error object");
      }

      // get return data from object
      const errorData = (error as any).data;
      const returnData =
        typeof errorData === "string" ? errorData : errorData.data;

      if (returnData === undefined || typeof returnData !== "string") {
        throw new AssertionError(
          "Expected Error object to contain return data"
        );
      }

      const decodedReturnData = decodeReturnData(returnData);

      if (decodedReturnData === null) {
        this.assert(
          false,
          `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with an unknown reason'`,
          // added just for the types, can't happen because the condition is always false
          "<this message should never be shown, please open an issue if it is>",
          `Transaction reverted with reason '${expectedReason}'`
        );
        return;
      }

      this.assert(
        decodedReturnData.reason === expectedReason,
        `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with reason '${decodedReturnData.reason}'`,
        `Expected transaction NOT to be reverted with reason '${expectedReason}', but it did`,
        `Transaction reverted with reason '${expectedReason}'`
      );
    };

    const derivedPromise = Promise.resolve(this._obj).then(onSuccess, onError);

    (this as any).then = derivedPromise.then.bind(derivedPromise);
    (this as any).catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });
}

interface DecodedReturnData {
  kind: "Error";
  reason: string;
}

function decodeReturnData(returnData: string): DecodedReturnData | null {
  if (returnData.startsWith(ERROR_STRING_PREFIX)) {
    const encodedReason = returnData.slice(ERROR_STRING_PREFIX.length);
    let reason: string;
    try {
      reason = abi.decode(["string"], `0x${encodedReason}`)[0];
    } catch (e: any) {
      throw new HardhatChaiMatchersDecodingError(encodedReason, "string", e);
    }

    return {
      kind: "Error",
      reason,
    };
  }

  return null;
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
