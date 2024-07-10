import type { ArgumentValue } from "../types/arguments.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ArgumentType } from "../types/arguments.js";

/**
 * Names that cannot be used for global or task arguments.
 * Reserved for future use.
 */
export const RESERVED_ARGUMENT_NAMES: Set<string> = new Set([]);

const VALID_ARGUMENT_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Returns true if the given name is a valid argument name.
 */
export function isArgumentNameValid(name: string): boolean {
  return VALID_ARGUMENT_NAME_PATTERN.test(name);
}

/**
 * Checks if an argument value is valid for a given argument type.
 *
 * This function uses a map of validators, where each validator is a function
 * that checks if a value is valid for a specific argument type.
 * If the argument type is variadic, the value is considered valid if it is an
 * array and all its elements are valid for the argument type. An empty array
 * is considered invalid.
 */
export function isArgumentValueValid(
  type: ArgumentType,
  value: unknown,
  isVariadic: boolean = false,
): boolean {
  const validator = argumentTypeValidators[type];

  if (isVariadic) {
    return Array.isArray(value) && value.every(validator);
  }

  return validator(value);
}

const argumentTypeValidators: Record<
  ArgumentType,
  (value: unknown) => boolean
> = {
  [ArgumentType.STRING]: (value): value is string => typeof value === "string",
  [ArgumentType.BOOLEAN]: (value): value is boolean =>
    typeof value === "boolean",
  [ArgumentType.INT]: (value): value is number => Number.isInteger(value),
  [ArgumentType.BIGINT]: (value): value is bigint => typeof value === "bigint",
  [ArgumentType.FLOAT]: (value): value is number => typeof value === "number",
  [ArgumentType.FILE]: (value): value is string => typeof value === "string",
};

/**
 * Parses an argument value from a string to the corresponding type.
 */
// TODO: this code is duplicated in v-next/hardhat/src/internal/cli/main.ts
// we should move it to a shared place and add tests
export function parseArgumentValue(
  value: string,
  type: ArgumentType,
  name: string,
): ArgumentValue {
  switch (type) {
    case ArgumentType.STRING:
    case ArgumentType.FILE:
      return value;
    case ArgumentType.INT:
      return validateAndParseInt(name, value);
    case ArgumentType.FLOAT:
      return validateAndParseFloat(name, value);
    case ArgumentType.BIGINT:
      return validateAndParseBigInt(name, value);
    case ArgumentType.BOOLEAN:
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
        type: ArgumentType.INT,
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
        type: ArgumentType.FLOAT,
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
        type: ArgumentType.BIGINT,
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
        type: ArgumentType.BOOLEAN,
      },
    );
  }

  return normalizedValue === "true";
}
