import type { BigNumber } from "ethers";

import { defaultAbiCoder as abi } from "@ethersproject/abi";
import { AssertionError } from "chai";

import { HardhatChaiMatchersDecodingError } from "./errors";
import { panicErrorCodeToReason } from "./panic";

// method id of 'Error(string)'
const ERROR_STRING_PREFIX = "0x08c379a0";

// method id of 'Panic(uint256)'
const PANIC_CODE_PREFIX = "0x4e487b71";

const CUSTOM_ERROR_ASSERTION_CALLED = "customErrorAssertionCalled";
const CUSTOM_ERROR_ASSERTION_DATA = "customErrorAssertionData";

interface CustomErrorAssertionData {
  contractInterface: any;
  returnData: string;
  customError: CustomError;
}

export function supportReverted(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
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
        } else if (decodedReturnData.kind === "Custom") {
          this.assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReason}', but it reverted with a custom error`
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
      } else if (decodedReturnData.kind === "Custom") {
        this.assert(
          false,
          `Expected transaction to be reverted without a reason string, but it reverted with a custom error`
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

  Assertion.addMethod(
    "revertedWithCustomError",
    function (this: any, contract: any, expectedCustomErrorName: string) {
      // check the case where users forget to pass the contract as the first
      // argument
      if (typeof contract === "string" || contract?.interface === undefined) {
        throw new Error(
          "The first argument of .revertedWithCustomError has to be the contract that defines the custom error"
        );
      }

      // validate custom error name
      if (typeof expectedCustomErrorName !== "string") {
        throw new AssertionError(
          "Expected a string as the expected custom error name"
        );
      }

      const iface: any = contract.interface;

      const expectedCustomError = findCustomErrorByName(
        iface,
        expectedCustomErrorName
      );

      // check that interface contains the given custom error
      if (expectedCustomError === undefined) {
        throw new Error(
          `The given contract doesn't have a custom error named ${expectedCustomErrorName}`
        );
      }

      const onSuccess = () => {
        this.assert(
          false,
          `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it didn't revert`
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
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with an unknown reason`
          );
        } else if (decodedReturnData.kind === "Empty") {
          this.assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted without a reason string`
          );
          return;
        } else if (decodedReturnData.kind === "Error") {
          this.assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with reason '${decodedReturnData.reason}'`
          );
        } else if (decodedReturnData.kind === "Panic") {
          this.assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
              decodedReturnData.description
            })`
          );
        } else if (decodedReturnData.kind === "Custom") {
          if (decodedReturnData.id === expectedCustomError.id) {
            const customErrorAssertionData: CustomErrorAssertionData = {
              contractInterface: iface,
              customError: expectedCustomError,
              returnData,
            };
            utils.flag(
              this,
              CUSTOM_ERROR_ASSERTION_DATA,
              customErrorAssertionData
            );

            this.assert(
              true,
              null,
              `Expected transaction NOT to be reverted with custom error '${expectedCustomErrorName}', but it did`
            );
          } else {
            const actualCustomError = findCustomErrorById(
              iface,
              decodedReturnData.id
            );

            if (actualCustomError === undefined) {
              this.assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with a different custom error`
              );
            } else {
              this.assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with custom error '${actualCustomError.name}'`
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

      utils.flag(this, CUSTOM_ERROR_ASSERTION_CALLED, true);
      this.promise = derivedPromise;

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );

  Assertion.addMethod("withArgs", function (this: any, ...expectedArgs: any[]) {
    if (utils.flag(this, CUSTOM_ERROR_ASSERTION_CALLED) !== true) {
      throw new Error(
        "withArgs called without a previous revertedWithCustomError assertion"
      );
    }

    const derivedPromise = this.promise.then(() => {
      const customErrorAssertionData: CustomErrorAssertionData = utils.flag(
        this,
        CUSTOM_ERROR_ASSERTION_DATA
      );

      if (customErrorAssertionData === undefined) {
        throw new Error(
          "[.withArgs] should never happen, please submit an issue"
        );
      }

      const { contractInterface, customError, returnData } =
        customErrorAssertionData;

      const errorFragment = contractInterface.errors[customError.signature];
      const actualArgs = contractInterface.decodeErrorResult(
        errorFragment,
        returnData
      );

      // TODO temporary solution until `.to.deep.equal` works correctly with big
      // numbers
      new Assertion(actualArgs).to.have.same.length(
        expectedArgs.length,
        `Expected ${expectedArgs.length} args but got ${actualArgs.length}`
      );

      for (const [i, actualArg] of Object.entries(actualArgs) as any) {
        new Assertion(actualArg).to.equal(expectedArgs[i]);
      }
    });

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
    }
  | {
      kind: "Custom";
      id: string;
      data: string;
    };

function decodeReturnData(returnData: string): DecodedReturnData {
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

  return {
    kind: "Custom",
    id: returnData.slice(0, 10),
    data: `0x${returnData.slice(10)}`,
  };
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

interface CustomError {
  name: string;
  id: string;
  signature: string;
}

function findCustomErrorByName(
  iface: any,
  name: string
): CustomError | undefined {
  const ethers = require("ethers");

  const customErrorEntry = Object.entries(iface.errors).find(
    ([, fragment]: any) => fragment.name === name
  );

  if (customErrorEntry === undefined) {
    return undefined;
  }

  const [customErrorSignature] = customErrorEntry;
  const customErrorId = ethers.utils.id(customErrorSignature).slice(0, 10);

  return {
    id: customErrorId,
    name,
    signature: customErrorSignature,
  };
}

function findCustomErrorById(iface: any, id: string): CustomError | undefined {
  const ethers = require("ethers");

  const customErrorEntry: any = Object.entries(iface.errors).find(
    ([signature]: any) => ethers.utils.id(signature).slice(0, 10) === id
  );

  if (customErrorEntry === undefined) {
    return undefined;
  }

  return {
    id,
    name: customErrorEntry[1].name,
    signature: customErrorEntry[0],
  };
}
