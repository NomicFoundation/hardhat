import type { Hex } from "viem";

import assert from "node:assert/strict";

export const ERROR_STRING_SELECTOR = "0x08c379a0"; // Error(string)
export const PANIC_SELECTOR = "0x4e487b71"; // Panic(uint256)

export function isKnownErrorSelector(data: Hex): boolean {
  const standardizedData = data.toLowerCase();

  return (
    standardizedData.startsWith(ERROR_STRING_SELECTOR) ||
    standardizedData.startsWith(PANIC_SELECTOR)
  );
}

export function getRevertErrorSelector(data: Hex): string {
  const standardizedData = data.toLowerCase();

  if (standardizedData.startsWith(ERROR_STRING_SELECTOR)) {
    return ERROR_STRING_SELECTOR;
  }

  if (standardizedData.startsWith(PANIC_SELECTOR)) {
    return PANIC_SELECTOR;
  }

  assert.fail("Unable to locate the correct error revert selector");
}
