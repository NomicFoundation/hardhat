import type { Hex } from "viem";

export const DEFAULT_REVERT_REASON_SELECTOR = "0x08c379a0";

export function isDefaultRevert(data: Hex): boolean {
  return data.toLowerCase().startsWith(DEFAULT_REVERT_REASON_SELECTOR);
}
