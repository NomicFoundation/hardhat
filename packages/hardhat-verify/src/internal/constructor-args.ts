import type { AbiFragment } from "@nomicfoundation/hardhat-utils/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  encodeAbiParameters,
  getAbiConstructorParameters,
  isAbiEncodingError,
} from "@nomicfoundation/hardhat-utils/abi";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

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
  abi: AbiFragment[],
  constructorArgs: unknown[],
  contract: string,
): Promise<string> {
  const constructorParameters = getAbiConstructorParameters(abi);

  try {
    const encodedArgs = await encodeAbiParameters(
      constructorParameters,
      constructorArgs,
    );

    return getUnprefixedHexString(encodedArgs);
  } catch (error) {
    ensureError(error);

    if (isAbiEncodingError(error, "parameters-length-mismatch")) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENTS_LENGTH,
        {
          contract,
          requiredArgs: error.expectedLength,
          providedArgs: error.providedLength,
        },
        error,
      );
    }

    if (isAbiEncodingError(error, "value-out-of-bounds")) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .CONSTRUCTOR_ARGUMENT_OVERFLOW,
        { value: String(error.value) },
        error,
      );
    }

    if (isAbiEncodingError(error, "invalid-value")) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENT_TYPE,
        { value: String(error.value), reason: error.reason },
        error,
      );
    }

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
        .CONSTRUCTOR_ARGUMENTS_ENCODING_FAILED,
      { contract, reason: error.message },
      error,
    );
  }
}
