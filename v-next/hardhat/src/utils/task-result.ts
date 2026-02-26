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
 * Creates a successful TaskResult without a value.
 *
 * @returns A TaskResult with success: true.
 */
export function taskSuccess(): TaskResult;
/**
 * Creates a successful TaskResult with a value.
 *
 * @param value The value to include in the result.
 * @returns A TaskResult with success: true and the given value.
 */
export function taskSuccess<ValueT>(value: ValueT): TaskResult<ValueT>;
export function taskSuccess(value?: unknown): TaskResult<unknown> {
  return arguments.length === 0 ? { success: true } : { success: true, value };
}

/**
 * Creates a failed TaskResult without a value.
 *
 * @returns A TaskResult with success: false.
 */
export function taskFailure(): TaskResult;
/**
 * Creates a failed TaskResult with a value.
 *
 * @param value The value to include in the result.
 * @returns A TaskResult with success: false and the given value.
 */
export function taskFailure<ValueT>(value: ValueT): TaskResult<ValueT>;
export function taskFailure(value?: unknown): TaskResult<unknown> {
  return arguments.length === 0
    ? { success: false }
    : { success: false, value };
}
