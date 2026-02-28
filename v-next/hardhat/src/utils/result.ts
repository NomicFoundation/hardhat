import type { Result } from "../types/result.js";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Creates a successful Result without a value.
 *
 * @returns A Result with success: true and value: undefined.
 */
export function successResult(): Result<undefined, never>;
/**
 * Creates a successful Result with the given value.
 *
 * @param value The value to include in the result.
 * @returns A Result with success: true and the given value.
 */
export function successResult<ValueT>(value: ValueT): Result<ValueT, never>;
export function successResult(value?: unknown): Result<unknown, never> {
  return { success: true, value };
}

/**
 * Creates a failed Result without an error.
 *
 * @returns A Result with success: false and error: undefined.
 */
export function errorResult(): Result<never, undefined>;
/**
 * Creates a failed Result with the given error.
 *
 * @param error The error to include in the result.
 * @returns A Result with success: false and the given error.
 */
export function errorResult<ErrorT>(error: ErrorT): Result<never, ErrorT>;
export function errorResult(error?: unknown): Result<never, unknown> {
  return { success: false, error };
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
