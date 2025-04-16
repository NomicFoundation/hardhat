import type { GenericFunction } from "../../types.js";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

export async function revert(fn: GenericFunction): Promise<void> {
  await checkRevert(fn);
}

export async function revertWith(
  fn: GenericFunction,
  expectedReason: string,
): Promise<void> {
  const reason = await checkRevert(fn);

  assert.equal(
    reason,
    expectedReason,
    `The function was expected to revert with reason "${expectedReason}", but it reverted with reason "${reason}".`,
  );
}

async function checkRevert(fn: GenericFunction): Promise<string> {
  let hasReverted = false;
  let reason = "";

  try {
    await fn();
  } catch (error) {
    ensureError(error);

    if ("details" in error) {
      hasReverted = true;

      assertHardhatInvariant(
        typeof error.details === "string",
        "The error details should be a string",
      );

      reason = error.details
        .split("reverted with reason string ")[1]
        .replaceAll("'", "");
    } else {
      throw error;
    }
  }

  assert.ok(
    hasReverted,
    "The function was expected to revert, but it did not.",
  );

  return reason;
}
