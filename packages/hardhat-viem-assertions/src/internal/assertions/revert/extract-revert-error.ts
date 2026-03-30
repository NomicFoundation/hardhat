import type { Hex } from "viem";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

/**
 * Recursively extracts, if it exists, the revert data hex string from an error.
 *
 * When a contract call reverts, Viem throws an `Error` whose `data` property
 * contains the hex-encoded revert reason. That `data` may live on the top-level
 * error or deeper in a chain of `cause` errors. This function walks down the
 * `cause` chain until it finds a valid `0x` hex string.
 *
 * @param error - The thrown Viem `Error` object, which may include a `data` field
 *                or nested `cause` errors carrying the revert data.
 * @returns The `0x` hex string representing the revert data.
 *
 * @throws If no valid `0x` prefixed hex string revert data is found anywhere in the error chain.
 */
export function extractRevertError(error: unknown): {
  name: string;
  message: string;
  data: Hex;
} {
  ensureError(error);

  let dataReason: Hex | undefined;

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
    `No revert data found on error.\nError name: "${error.name}", message: ${error.message}`,
  );

  return {
    name: error.name,
    message,
    data: dataReason,
  };
}
