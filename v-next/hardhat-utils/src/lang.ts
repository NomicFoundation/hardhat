import {
  customFastEqual,
  deepMergeImpl,
  getDeepCloneFunction,
} from "./internal/lang.js";

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
  return customFastEqual(x, y);
}

/**
 * Deeply merges two objects.
 *
 * @remarks
 * - Arrays or `undefined` values are not valid inputs.
 * - Functions: If a function exists in both the target and source, the source
 * function overwrites the target.
 * - Symbol properties: Symbol-keyed properties are merged just like string
 * keys.
 * - Class instances: Class instances are not merged recursively. If a class
 * instance exists in the source, it will replace the one in the target.
 *
 * @param target The target object to merge into.
 * @param source The source object to merge from.
 * @param shouldOverwriteUndefined If true, properties with `undefined` values
 * in the source will overwrite those in the target. Default is true.
 * @returns A new object containing the deeply merged properties.
 *
 * @example
 * deepMerge({ a: { b: 1 } }, { a: { c: 2 } }) // => { a: { b: 1, c: 2 } }
 *
 * deepMerge(
 *   { a: { fn: () => "from target" } },
 *   { a: { fn: () => "from source" } }
 * ) // => { a: { fn: () => "from source" } }
 */
export function deepMerge<T extends object, U extends object>(
  target: T,
  source: U,
  shouldOverwriteUndefined: boolean = true,
): T & U {
  return deepMergeImpl(target, source, shouldOverwriteUndefined);
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

/**
 * Binds all methods of an object to the object itself, so that they can be
 * assigned to an independent variable and still work.
 *
 * @param obj The object, which can be an instance of a class.
 */
export function bindAllMethods<ObjectT extends object>(obj: ObjectT): void {
  const prototype = Object.getPrototypeOf(obj);
  const prototypeKeys =
    prototype !== null ? Object.getOwnPropertyNames(prototype) : [];

  const keys = [...prototypeKeys, ...Object.getOwnPropertyNames(obj)];

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    typescript can't express this in a safe way, so we use any here */
  const objAsAny = obj as any;

  // Exclude methods that should not be rebound (constructor, Object.prototype methods, etc.)
  const EXCLUDED_METHODS = [
    "constructor",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toLocaleString",
    "toString",
    "valueOf",
  ];

  for (const key of keys) {
    const val = objAsAny[key];
    if (typeof val === "function" && !EXCLUDED_METHODS.includes(key)) {
      objAsAny[key] = val.bind(obj);
    }
  }
}
