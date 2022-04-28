import { defaultAbiCoder as abi } from "@ethersproject/abi";
import { AssertionError } from "chai";
import type { BigNumber } from "ethers";

import { HardhatChaiMatchersDecodingError } from "./errors";
import { panicErrorCodeToReason } from "./panic";

// method id of 'Error(string)'
const ERROR_STRING_PREFIX = "0x08c379a0";

// method id of 'Panic(uint256)'
const PANIC_CODE_PREFIX = "0x4e487b71";

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
        this.assert(false, "Expected transaction to be reverted");
      }
    };

    const onError = (error: any) => {
      if (!(error instanceof Error)) {
        throw new AssertionError("Expected an Error object");
      }

      if (!isRevertError(error)) {
        return Promise.reject(error);
      }

      this.assert(true, null, "Expected transaction NOT to be reverted");
    };

    // we use `Promise.resolve(subject)` so we can process both values and
    // promises of values in the same way
    const derivedPromise = Promise.resolve(subject).then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });

  Assertion.addMethod(
    "revertedWith",
    function (this: any, expectedReason: unknown) {
      // validate expected reason
      if (typeof expectedReason !== "string") {
        const rejection = Promise.reject(
          new AssertionError("Expected a string as the expected reason string")
        );

        this.then = rejection.then.bind(rejection);
        this.catch = rejection.catch.bind(rejection);

        return this;
      }

      const onSuccess = () => {
        this.assert(
          false,
          `Expected transaction to be reverted with reason '${expectedReason}', but it didn't revert`
        );
      };

      const onError = (error: any) => {
        if (!(error instanceof Error)) {
          throw new AssertionError("Expected an Error object");
        }

        const returnData = getReturnDataFromError(error);

        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData === null) {
          this.assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with an unknown reason`
          );
        } else if (decodedReturnData.kind === "Empty") {
          this.assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReason}', but it reverted without a reason string`
          );
          return;
        } else if (decodedReturnData.kind === "Error") {
          this.assert(
            decodedReturnData.reason === expectedReason,
            `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with reason '${decodedReturnData.reason}'`,
            `Expected transaction NOT to be reverted with reason '${expectedReason}', but it did`
          );
        } else if (decodedReturnData.kind === "Panic") {
          this.assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
              decodedReturnData.description
            })`
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
        const rejection = Promise.reject(
          new AssertionError(
            "Expected a number or BigNumber as the expected panic code"
          )
        );

        this.then = rejection.then.bind(rejection);
        this.catch = rejection.catch.bind(rejection);

        return this;
      }

      const code: number | undefined = expectedCode as any;

      let description: string | undefined;
      let formattedPanicCode: string;
      if (code === undefined) {
        formattedPanicCode = "some panic code";
      } else {
        const codeBN = ethers.BigNumber.from(code);
        description = panicErrorCodeToReason(codeBN);
        formattedPanicCode = `panic code ${codeBN.toHexString()} (${description})`;
      }

      const onSuccess = () => {
        this.assert(
          false,
          `Expected transaction to be reverted with ${formattedPanicCode}, but it didn't revert`
        );
      };

      const onError = (error: any) => {
        if (!(error instanceof Error)) {
          throw new AssertionError("Expected an Error object");
        }

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
          return;
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

  Assertion.addMethod("revertedWithoutReasonString", function (this: any) {
    const onSuccess = () => {
      this.assert(
        false,
        `Expected transaction to be reverted without a reason string, but it didn't revert`
      );
    };

    const onError = (error: any) => {
      if (!(error instanceof Error)) {
        throw new AssertionError("Expected an Error object");
      }

      const returnData = getReturnDataFromError(error);
      const decodedReturnData = decodeReturnData(returnData);

      if (decodedReturnData === null) {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason string, but it reverted with an unknown reason`
        );
      } else if (decodedReturnData.kind === "Error") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason string, but it reverted with reason '${decodedReturnData.reason}'`
        );
      } else if (decodedReturnData.kind === "Empty") {
        this.assert(
          true,
          null,
          "Expected transaction NOT to be reverted without a reason string, but it did"
        );
      } else if (decodedReturnData.kind === "Panic") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason string, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
            decodedReturnData.description
          })`
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

function isRevertError(error: any): boolean {
  try {
    getReturnDataFromError(error);
    return true;
  } catch (e) {
    return false;
  }
}

function getReturnDataFromError(error: any): string {
  const errorData = (error as any).data;

  if (errorData === undefined) {
    throw new AssertionError("Expected Error object to contain return data");
  }

  const returnData = typeof errorData === "string" ? errorData : errorData.data;

  if (returnData === undefined || typeof returnData !== "string") {
    throw new AssertionError("Expected Error object to contain return data");
  }

  return returnData;
}

type DecodedReturnData =
  | {
      kind: "Error";
      reason: string;
    }
  | {
      kind: "Empty";
    }
  | {
      kind: "Panic";
      code: BigNumber;
      description: string;
    };

function decodeReturnData(returnData: string): DecodedReturnData | null {
  if (returnData === "0x") {
    return { kind: "Empty" };
  } else if (returnData.startsWith(ERROR_STRING_PREFIX)) {
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
  } else if (returnData.startsWith(PANIC_CODE_PREFIX)) {
    const encodedReason = returnData.slice(PANIC_CODE_PREFIX.length);
    let code: BigNumber;
    try {
      code = abi.decode(["uint256"], `0x${encodedReason}`)[0];
    } catch (e: any) {
      throw new HardhatChaiMatchersDecodingError(encodedReason, "uint256", e);
    }

    const description = panicErrorCodeToReason(code) ?? "unknown panic code";

    return {
      kind: "Panic",
      code,
      description,
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
