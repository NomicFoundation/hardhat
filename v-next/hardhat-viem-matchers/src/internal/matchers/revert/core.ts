import type { GenericFunction } from "../../../types.js";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { decodeErrorResult } from "viem";

export async function handleRevert(fn: GenericFunction): Promise<string> {
  try {
    await fn();
  } catch (error) {
    ensureError(error);

    const data = extractRevertData(error);

    const { args } = decodeErrorResult({ data });

    return args.map(String).join(", ");
  }

  assert.fail("The function was expected to revert, but it did not.");
}

function extractRevertData(
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
