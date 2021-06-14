import Common from "@ethereumjs/common";

/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
export function hardforkGte(hardforkA: string, hardforkB: string): boolean {
  const common = new Common({ chain: "mainnet" });
  return common.hardforkGteHardfork(hardforkA, hardforkB);
}
