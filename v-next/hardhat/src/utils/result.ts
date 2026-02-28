import type { Result } from "../types/result.js";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Creates a successful Result with the given value.
 *
 * @param value The value to include in the result.
 * @returns A Result with success: true and the given value.
 */
export function successResult<ValueT = undefined>(
  ...args: ValueT extends undefined | void ? [] : [value: ValueT]
): { success: true; value: ValueT } {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast needed because TS loses the conditional rest parameter context */
  return { success: true, value: args[0] as ValueT };
}

/**
 * Creates a failed Result with the given error.
 *
 * @param error The error to include in the result.
 * @returns A Result with success: false and the given error.
 */
export function errorResult<ErrorT = undefined>(
  ...args: ErrorT extends undefined | void ? [] : [error: ErrorT]
): { success: false; error: ErrorT } {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast needed because TS loses the conditional rest parameter context */
  return { success: false, error: args[0] as ErrorT };
}

/**
 * A type guard that checks if a value is a Result.
 *
 * Optionally validates the value and error fields using type guard functions.
 *
 * @param value The value to check.
 * @param isValue Optional type guard for the value field.
 * @param isError Optional type guard for the error field.
 * @returns true if the value is a Result.
 */
export function isResult<ValueT = unknown, ErrorT = unknown>(
  value: unknown,
  isValue?: (v: unknown) => v is ValueT,
  isError?: (e: unknown) => e is ErrorT,
): value is Result<ValueT, ErrorT> {
  if (!isObject(value) || typeof value.success !== "boolean") {
    return false;
  }

  if (value.success === true) {
    return isValue === undefined || isValue(value.value);
  }

  return isError === undefined || isError(value.error);
}
