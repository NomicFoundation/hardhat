export const DEFAULT_REVERT_REASON_SELECTOR = "0x08c379a0";

export function isDefaultRevert(data: `0x${string}`): boolean {
  return data.toLowerCase().startsWith(DEFAULT_REVERT_REASON_SELECTOR);
}
