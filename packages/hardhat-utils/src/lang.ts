import { getDeepCloneFunction } from "./internal/lang.js";

/**
 * Creates a deep clone of the provided value.
 *
 * @param value The value to clone.
 * @returns The deep clone of the provided value.
 */
export async function deepClone<T>(value: T): Promise<T> {
  const _deepClone = await getDeepCloneFunction();

  return _deepClone<T>(value);
}

/**
 * Checks if two values are deeply equal.
 *
 * @param x The first value to compare.
 * @param y The second value to compare.
 * @returns True if the values are deeply equal, false otherwise.
 */
export async function deepEqual<T>(x: T, y: T): Promise<boolean> {
  const { deepEqual: _deepEqual } = await import("fast-equals");

  return _deepEqual(x, y);
}
