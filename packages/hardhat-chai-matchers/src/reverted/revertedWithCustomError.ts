import { AssertionError } from "chai";
import { decodeReturnData, getReturnDataFromError } from "./utils";

const CUSTOM_ERROR_ASSERTION_CALLED = "customErrorAssertionCalled";
const CUSTOM_ERROR_ASSERTION_DATA = "customErrorAssertionData";

interface CustomErrorAssertionData {
  contractInterface: any;
  returnData: string;
  customError: CustomError;
}

export function supportRevertedWithCustomError(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    "revertedWithCustomError",
    function (this: any, contract: any, expectedCustomErrorName: string) {
      // check the case where users forget to pass the contract as the first
      // argument
      if (typeof contract === "string" || contract?.interface === undefined) {
        throw new TypeError(
          "The first argument of .revertedWithCustomError has to be the contract that defines the custom error"
        );
      }

      // validate custom error name
      if (typeof expectedCustomErrorName !== "string") {
        throw new TypeError(
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
        throw new AssertionError(
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
            // add flag with the data needed for .withArgs
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
            // try to decode the actual custom error
            // this will only work when the error comes from the given contract
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

      // needed for .withArgs
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
          "[.withArgs] should never happen, please submit an issue to the Hardhat repository"
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
