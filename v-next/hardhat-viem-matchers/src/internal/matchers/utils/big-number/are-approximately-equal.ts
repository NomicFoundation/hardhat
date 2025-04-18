import assert from "node:assert/strict";

export function areApproximatelyEqual(
  n1: bigint,
  n2: bigint,
  variance: bigint,
): void {
  const diff = n1 >= n2 ? n1 - n2 : n2 - n1;

  assert.ok(
    diff <= variance,
    `Expected ${n1} to be approximately equal to ${n2} within a variance of ${variance}, but found a difference of ${diff}.`,
  );
}
