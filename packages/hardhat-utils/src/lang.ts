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

// export function deepEqual<T>(a: T, b: T): boolean {}
