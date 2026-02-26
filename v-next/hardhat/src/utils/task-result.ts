import type { TaskResult } from "../types/tasks.js";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * A type guard that checks if a value is a TaskResult.
 *
 * @param value The value to check.
 * @returns true if the value is a TaskResult.
 */
export function isTaskResult(value: unknown): value is TaskResult<unknown> {
  return isObject(value) && typeof value.success === "boolean";
}

/**
 * Creates a successful TaskResult.
 *
 * @param value The value to include in the result.
 * @returns A TaskResult with success: true and the given value.
 */
export function taskSuccess<ValueT>(value: ValueT): TaskResult<ValueT> {
  return { success: true, value };
}

/**
 * Creates a failed TaskResult.
 *
 * @returns A TaskResult with success: false.
 */
export function taskFailure(): TaskResult<never> {
  return { success: false };
}
