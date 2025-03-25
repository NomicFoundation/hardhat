import { deepMergeImpl, getDeepCloneFunction } from "./internal/lang.js";

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
 * Deeply merges two objects.
 *
 * @remarks
 * Arrays or `undefined` values are not valid inputs.
 * Functions and symbol properties are not supported.
 *
 * @param target The target object to merge into.
 * @param source The source object to merge from.
 * @returns A new object containing the deeply merged properties.
 *
 * @example
 * deepMerge({ a: { b: 1 } }, { a: { c: 2 } }) // => { a: { b: 1, c: 2 } }
 */
export function deepMerge<T extends object, U extends object>(
  target: T,
  source: U,
): T & U {
  return deepMergeImpl(target, source);
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
 * @param seconds The number of seconds to pause the execution.
 * @returns A promise that resolves after the specified number of seconds.
 */
export async function sleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
