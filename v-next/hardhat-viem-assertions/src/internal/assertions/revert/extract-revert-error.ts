import type { ContractFunctionExecutionError, Hex } from "viem";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

type DecodedOrRawError = {
  name: string;
} & (
  | {
      decodedMessage: string;
      data: undefined;
    }
  | {
      message: string;
      data: Hex;
    }
);

/**
 * Extracts information about the reason the error occurred.
 *
 * An error can either be a raw error containing the revert reason
 * as a hex string, or a Viem-decoded error with a structured format.
 *
 * @param error - The thrown error object, which may be a raw error or a Viem decoded error.
 *
 * @returns An object containing information about either the raw revert error or the Viem decoded error.
 *
 */
export function extractRevertError(error: unknown): DecodedOrRawError {
  if (isObject(error) && "cause" in error) {
    return findRawError(error);
  }

  return findViemError(error);
}

function findRawError(error: unknown): DecodedOrRawError {
  let dataReason: Hex | undefined;

  ensureError(error);

  let current: Error | undefined = error;
  let message: string = "";
  while (current !== undefined) {
    // Traverse the cause chain to find a valid raw error reason, if one exists.
    if ("data" in current) {
      const { data } = current;

      if (typeof data === "string" && isPrefixedHexString(data)) {
        dataReason = data;
        message = current.message;
      }
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- all the nested errors might contain a `cause` field */
    current = current.cause as Error | undefined;
  }

  assertHardhatInvariant(
    dataReason !== undefined,
    "No revert data found on error",
  );

  return {
    name: error.name,
    message,
    data: dataReason,
  };
}

function findViemError(error: unknown) {
  // Viem-decoded error, for example, when a function expects a uint but an int is provided.
  ensureError<ContractFunctionExecutionError>(error);

  return {
    name: error.name,
    decodedMessage: error.shortMessage,
    data: undefined,
  };
}
