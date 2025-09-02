import type { ContractFunctionExecutionError, Hex } from "viem";

import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

type DecodedOrRawError = {
  name: string;
} & (
  | {
      message: string;
      data: undefined;
    }
  | {
      message: undefined;
      data: Hex;
    }
);

/**
 * Recursively extracts the revert data hex string from a nested Viem error, if it exists.
 * Falls back to a short error message when no revert data is found.
 *
 * When a contract call reverts, Viem throws an error whose `data` property
 * may contain the hex-encoded revert reason. This `data` can be present either
 * on the top-level error or nested deeper within a chain of `cause` errors.
 * This function traverses the `cause` chain until it finds a valid `0x` hex string.
 *
 * @param error - The thrown Viem error object, which may contain a `data` field
 *                or nested `cause` errors carrying the revert data.
 * @returns The error name and the `0x` hex string representing the revert data,
 *          or a fallback message if none is found.
 */
export function extractRevertData(
  error: ContractFunctionExecutionError,
): DecodedOrRawError {
  let current: typeof error | undefined = error;

  let dataReason: Hex | undefined;
  while (current !== undefined) {
    // Traverse the cause chain to find a valid raw error reason, if one exists.
    if ("data" in current) {
      const { data } = current;

      if (typeof data === "string" && isPrefixedHexString(data)) {
        dataReason = data;
      }
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- all the nested errors might contain a `cause` field */
    current = current.cause as typeof error | undefined;
  }

  if (dataReason !== undefined) {
    return {
      name: error.name,
      message: undefined,
      data: dataReason,
    };
  }

  // If no hexadecimal reason is found, return the short fallback message that is always present.
  // This also handles cases where the error is a PANIC, such as an overflow.
  return {
    name: error.name,
    message: error.shortMessage,
    data: undefined,
  };
}
