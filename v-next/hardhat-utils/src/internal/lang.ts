import type rfdcT from "rfdc";

import { isObject } from "../lang.js";

let clone: ReturnType<typeof rfdcT> | null = null;
export async function getDeepCloneFunction(): Promise<<T>(input: T) => T> {
  const { default: rfdc } = await import("rfdc");

  if (clone === null) {
    clone = rfdc();
  }

  return clone;
}

export function deepMergeImpl<T extends object, S extends object>(
  target: T,
  source: S,
  shouldOverwriteUndefined: boolean,
): T & S {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Result will include properties from both T and S, but starts with only T */
  const result = { ...target } as T & S;

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- All keys come from S, TypeScript can't infer the union of string and symbol keys */
  const keys = [
    ...Object.keys(source),
    ...Object.getOwnPropertySymbols(source),
  ] as Array<keyof S>;

  for (const key of keys) {
    if (
      isObject(source[key]) &&
      // Only merge plain objects, not class instances
      Object.getPrototypeOf(source[key]) === Object.prototype
    ) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- result[key] will have the correct type after assignment but TS can't infer it */
      result[key] = deepMergeImpl(
        result[key] ?? {},
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- source[key] is known to be from S but TS can't infer it */
        source[key] as S,
        shouldOverwriteUndefined,
      ) as (T & S)[Extract<keyof S, string>];
    } else if (shouldOverwriteUndefined || source[key] !== undefined) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- result[key] will have the correct type after assignment but TS can't infer it */
      result[key] = source[key] as (T & S)[Extract<keyof S, string>];
    }
  }

  return result;
}

let cachedCustomEqual: ((a: any, b: any) => boolean) | undefined;

/**
 * Performs a custom deep equality check using `fast-equals` with specific overrides.
 *
 * @param x The first value to compare.
 * @param y The second value to compare.
 * @returns A promise that resolves to true if the values are deeply equal, false otherwise.
 */
export async function customFastEqual<T>(x: T, y: T): Promise<boolean> {
  if (cachedCustomEqual !== undefined) {
    return cachedCustomEqual(x, y);
  }

  const { createCustomEqual } = await import("fast-equals");

  cachedCustomEqual = createCustomEqual({
    createCustomConfig: (defaultConfig) => ({
      areTypedArraysEqual: (a, b, state) => {
        // Node.js pools small buffers, so they often share the same underlying ArrayBuffer
        // but reside at different offsets.
        // Example:
        //   const b1 = Buffer.from('a'); // byteOffset: 0
        //   const b2 = Buffer.from('a'); // byteOffset: 8
        // Default equality checks structure (including offset) and fails.
        // We force usage of .equals() to check content only.
        if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) {
          return a.equals(b);
        }

        return defaultConfig.areTypedArraysEqual(a, b, state);
      },
    }),
  });

  return cachedCustomEqual(x, y);
}
