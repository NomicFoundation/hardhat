import type { ParameterValue } from "../types/common.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ParameterType } from "../types/common.js";

/**
 * Names that can't be used as global- nor task-parameter names. These are
 * reserved for future use.
 */
export const RESERVED_PARAMETER_NAMES: Set<string> = new Set([]);

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
 * array and all its elements are valid for the parameter type. An empty array
 * is considered invalid.
 */
export function isParameterValueValid(
  type: ParameterType,
  value: unknown,
  isVariadic: boolean = false,
): boolean {
  const validator = parameterTypeValidators[type];

  if (isVariadic) {
    return Array.isArray(value) && value.length > 0 && value.every(validator);
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

/**
 * Parses a parameter value from a string to the corresponding type.
 */
// TODO: this code is duplicated in v-next/hardhat/src/internal/cli/main.ts
// we should move it to a shared place and add tests
export function parseParameterValue(
  value: string,
  type: ParameterType,
  name: string,
): ParameterValue {
  switch (type) {
    case ParameterType.STRING:
    case ParameterType.FILE:
      return value;
    case ParameterType.INT:
      return validateAndParseInt(name, value);
    case ParameterType.FLOAT:
      return validateAndParseFloat(name, value);
    case ParameterType.BIGINT:
      return validateAndParseBigInt(name, value);
    case ParameterType.BOOLEAN:
      return validateAndParseBoolean(name, value);
  }
}

function validateAndParseInt(name: string, value: string): number {
  const decimalPattern = /^\d+(?:[eE]\d+)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (!decimalPattern.test(value) && !hexPattern.test(value)) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value,
        name,
        type: ParameterType.INT,
      },
    );
  }

  return Number(value);
}

function validateAndParseFloat(name: string, value: string): number {
  const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]\d+)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (!decimalPattern.test(value) && !hexPattern.test(value)) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value,
        name,
        type: ParameterType.FLOAT,
      },
    );
  }

  return Number(value);
}

function validateAndParseBigInt(name: string, value: string): bigint {
  const decimalPattern = /^\d+(?:n)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (!decimalPattern.test(value) && !hexPattern.test(value)) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value,
        name,
        type: ParameterType.BIGINT,
      },
    );
  }

  return BigInt(value.replace("n", ""));
}

function validateAndParseBoolean(name: string, value: string): boolean {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue !== "true" && normalizedValue !== "false") {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value,
        name,
        type: ParameterType.BOOLEAN,
      },
    );
  }

  return normalizedValue === "true";
}
