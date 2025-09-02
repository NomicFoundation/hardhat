import type { Hex } from "viem";

import assert from "node:assert/strict";

export const REVERT_REASON_ERROR_SELECTOR = "0x08c379a0"; // Error(string)
export const REVERT_REASON_PANIC_SELECTOR = "0x4e487b71"; // Panic(uint256)

export function isKnownErrorString(data: Hex): boolean {
  const standardizedData = data.toLowerCase();

  return (
    standardizedData.startsWith(REVERT_REASON_ERROR_SELECTOR) ||
    standardizedData.startsWith(REVERT_REASON_PANIC_SELECTOR)
  );
}

export function getRevertErrorString(data: Hex): string {
  const standardizedData = data.toLowerCase();

  if (standardizedData.startsWith(REVERT_REASON_ERROR_SELECTOR)) {
    return REVERT_REASON_ERROR_SELECTOR;
  }

  if (standardizedData.startsWith(REVERT_REASON_PANIC_SELECTOR)) {
    return REVERT_REASON_PANIC_SELECTOR;
  }

  assert.fail("Unable to locate the correct error revert selector.");
}
