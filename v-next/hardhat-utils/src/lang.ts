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

/**
 * Checks if a value is an object. This function returns false for arrays.
 *
 * @param value The value to check.
 * @returns True if the value is an object, false otherwise.
 */
export function isObject(
  value: unknown,
): value is Record<string | symbol, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pauses the execution for the specified number of seconds.
 *
 * @param seconds The number of seconds to delay.
 * @returns A promise that resolves after the specified delay.
 */
export async function delay(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
