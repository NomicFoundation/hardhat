import type { JsonFragment } from "@ethersproject/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Encodes constructor arguments for a contract using its ABI.
 *
 * @param abi The ABI of the contract.
 * @param constructorArgs The constructor arguments to encode.
 * @param contract The fully qualified name of the contract.
 * @returns Encoded constructor arguments as an unprefixed hex string.
 * @throws {HardhatError} If the constructor arguments are invalid, such as:
 * - Mismatched number of arguments
 * - Invalid argument types (e.g., passing a number instead of a string)
 * - Overflow errors in numeric arguments
 */
export async function encodeConstructorArgs(
  abi: JsonFragment[],
  constructorArgs: unknown[],
  contract: string,
): Promise<string> {
  // TODO: consider replacing with @metamask/abi-utils or micro-eth-signer
  const { Interface } = await import("@ethersproject/abi");

  const contractInterface = new Interface(abi);

  try {
    // encodeDeploy doesn't catch subtle type mismatches, such as a number
    // being passed when a string is expected, so we have to validate the
    // scenario manually. This can happen when the verify plugin is used
    // programmatically or the constructor arguments are passed
    // through a module (via --constructor-args-path).
    const expectedConstructorArgs = contractInterface.deploy.inputs;
    if (expectedConstructorArgs.length === constructorArgs.length) {
      constructorArgs.forEach((arg, i) => {
        const expectedArg = expectedConstructorArgs[i];
        if (expectedArg.type === "string" && typeof arg !== "string") {
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.INVALID_CONSTRUCTOR_ARGUMENT_TYPE,
            {
              value: String(arg),
              reason: "invalid string value",
            },
          );
        }
      });
    }

    return getUnprefixedHexString(
      contractInterface.encodeDeploy(constructorArgs),
    );
  } catch (error) {
    ensureError(error);

    if (isInvalidConstructorArgsLengthError(error)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.INVALID_CONSTRUCTOR_ARGUMENTS_LENGTH,
        {
          contract,
          requiredArgs: error.count.types,
          providedArgs: error.count.values,
        },
      );
    }

    if (isInvalidConstructorArgTypeError(error)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.INVALID_CONSTRUCTOR_ARGUMENT_TYPE,
        {
          value: String(error.value),
          reason: error.reason,
        },
      );
    }

    if (isConstructorArgOverflowError(error)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONSTRUCTOR_ARGUMENT_OVERFLOW,
        {
          value: String(error.value),
        },
      );
    }

    if (HardhatError.isHardhatError(error)) {
      throw error;
    }

    const reason =
      "reason" in error && typeof error.reason === "string"
        ? error.reason
        : error.message ?? "Unknown error";
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONSTRUCTOR_ARGUMENTS_ENCODING_FAILED,
      {
        contract,
        reason,
      },
    );
  }
}

interface InvalidConstructorArgsLengthErrorType extends Error {
  code: "INVALID_ARGUMENT";
  count: {
    types: number;
    values: number;
  };
}

function isInvalidConstructorArgsLengthError(
  error: Error,
): error is InvalidConstructorArgsLengthErrorType {
  return (
    "code" in error &&
    error.code === "INVALID_ARGUMENT" &&
    "count" in error &&
    isObject(error.count) &&
    typeof error.count.types === "number" &&
    typeof error.count.values === "number"
  );
}

interface InvalidConstructorArgErrorType extends Error {
  code: "INVALID_ARGUMENT";
  argument: string;
  value: unknown;
  reason: string;
}

function isInvalidConstructorArgTypeError(
  error: Error,
): error is InvalidConstructorArgErrorType {
  return (
    "code" in error &&
    error.code === "INVALID_ARGUMENT" &&
    "argument" in error &&
    typeof error.argument === "string" &&
    "value" in error &&
    "reason" in error &&
    typeof error.reason === "string" &&
    error.reason !== "value out-of-bounds"
  );
}

interface ConstructorArgOverflowErrorType extends Error {
  code: "INVALID_ARGUMENT";
  argument: string;
  value: unknown;
  reason: "value out-of-bounds";
}

function isConstructorArgOverflowError(
  error: Error,
): error is ConstructorArgOverflowErrorType {
  return (
    "code" in error &&
    error.code === "INVALID_ARGUMENT" &&
    "argument" in error &&
    typeof error.argument === "string" &&
    "value" in error &&
    "reason" in error &&
    error.reason === "value out-of-bounds"
  );
}
