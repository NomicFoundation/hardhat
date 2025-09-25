import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

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
