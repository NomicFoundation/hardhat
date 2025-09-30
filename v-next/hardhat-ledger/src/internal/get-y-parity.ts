import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

/**
 * Extract the y-parity bit (0, 1) from an Ethereum signature's `v` component.
 *
 * Accepted `v` formats
 * - 27 / 28  – legacy signatures (v = 27 + yParity) -> v - 27
 * - 0 / 1    – already normalized signatures -> v
 * - ≥ 35     – EIP-155 (v = 35 + 2 * chainId + yParity) → (v - 35) % 2
 *
 * @param v - The raw `v` value from the signature.
 *
 * @returns 0 or 1 - the y-parity bit.
 *
 * @throws If `v` is not one of the recognized encodings above.
 */
export function getYParity(v: number): number {
  if (v === 27 || v === 28) {
    return v - 27;
  }

  if (v === 0 || v === 1) {
    return v;
  }

  if (v >= 35) {
    return (v - 35) % 2;
  }

  assertHardhatInvariant(false, `Unexpected "v" value: ${v}`);
}
