// eslint-disable-next-line no-restricted-imports -- we want to cases like: 1n === 1
import assert from "node:assert";

/**
 * We cannot use the "deepEqual" method from "hardhat-utils" because it requires the compared values to be strictly identical.
 * For example, `1n === 1` evaluates to false.
 * In the V2 code, the values were normalized to BigInts before comparison because it was possible to pass a "comparator" function to the "deepEqual" method (this method came from the "deep-eql" package, which is now removed).
 * The current solution is to use the "assert.deepEqual" method from "node:assert" with a relaxed comparison (non-strict), allowing `1n === 1` to evaluate as true.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch (e) {
    return false;
  }
}
