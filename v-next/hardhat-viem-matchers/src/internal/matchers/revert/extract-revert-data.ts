import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

/**
 * Recursively extracts, if it exists, the revert data hex string from a nested Viem error.
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
export function extractRevertData(
  error: Error & { data?: unknown; cause?: unknown },
): `0x${string}` {
  let errorData: `0x${string}` | undefined;
  let current: typeof error | undefined = error;

  while (current !== undefined) {
    const { data } = current;

    if (typeof data === "string" && isPrefixedHexString(data)) {
      errorData = data;
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- all the nested errors might contain a `cause` field */
    current = current.cause as typeof error | undefined;
  }

  // In a revert scenario, a data field containing the revert reason is always expected
  assertHardhatInvariant(
    errorData !== undefined,
    "No revert data found on error",
  );

  return errorData;
}
