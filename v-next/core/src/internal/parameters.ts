import { ParameterType } from "../types/common.js";

/**
 * Names that can't be used as global- nor task-parameter names.
 */
export const RESERVED_PARAMETER_NAMES = new Set([
  "config",
  "help",
  "showStackTraces",
  "version",
]);

const VALID_PARAM_NAME_CASING_REGEX = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Returns true if the given name is a valid parameter name.
 */
export function isValidParamNameCasing(name: string): boolean {
  return VALID_PARAM_NAME_CASING_REGEX.test(name);
}

/**
 * Checks if a parameter value is valid for a given parameter type.
 *
 * This function uses a map of validators, where each validator is a function
 * that checks if a value is valid for a specific parameter type.
 * If the parameter type is variadic, the value is considered valid if it is an
 * array and all its elements are valid for the parameter type.
 */
export function isParameterValueValid(
  type: ParameterType,
  value: unknown,
  isVariadic: boolean = false,
): boolean {
  const validator = parameterTypeValidators[type];

  if (isVariadic) {
    return Array.isArray(value) && value.every(validator);
  }

  return validator(value);
}

const parameterTypeValidators: Record<
  ParameterType,
  (value: unknown) => boolean
> = {
  [ParameterType.STRING]: (value): value is string => typeof value === "string",
  [ParameterType.BOOLEAN]: (value): value is boolean =>
    typeof value === "boolean",
  [ParameterType.INT]: (value): value is number => Number.isInteger(value),
  [ParameterType.BIGINT]: (value): value is bigint => typeof value === "bigint",
  [ParameterType.FLOAT]: (value): value is number => typeof value === "number",
  [ParameterType.FILE]: (value): value is string => typeof value === "string",
};
