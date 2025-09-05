import type { Hex } from "viem";

const ERROR_STRING_SELECTOR = "0x08c379a0"; // Error(string)
const PANIC_SELECTOR = "0x4e487b71"; // Panic(uint256)

export function isKnownErrorSelector(data: Hex): boolean {
  const standardizedData = data.toLowerCase();

  return (
    standardizedData.startsWith(ERROR_STRING_SELECTOR) ||
    standardizedData.startsWith(PANIC_SELECTOR)
  );
}

export function isPanicErrorSelector(data: Hex): boolean {
  return data.toLowerCase().startsWith(PANIC_SELECTOR);
}
