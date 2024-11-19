// eslint-disable-next-line no-restricted-imports -- we want to cases like: 1n === 1
import assert from "node:assert";

export function deepEqual(a: unknown, b: unknown): boolean {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch (e) {
    return false;
  }
}
