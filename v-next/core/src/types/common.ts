/**
 * The possible types of a global or task parameter.
 */
export enum ParameterType {
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  INT = "INT",
  BIGINT = "BIGINT",
  FLOAT = "FLOAT",
  FILE = "FILE",
}

/**
 * Maps all the `ParameterType` values to their corresponding value types.
 */
export interface ParameterToValueTypeMap {
  [ParameterType.STRING]: string;
  [ParameterType.BOOLEAN]: boolean;
  [ParameterType.INT]: number;
  [ParameterType.BIGINT]: bigint;
  [ParameterType.FLOAT]: number;
  [ParameterType.FILE]: string;
}

/**
 * All the possible values for a parameter.
 */
export type ParameterValue =
  ParameterToValueTypeMap[keyof ParameterToValueTypeMap];

/**
 * Maps a `ParameterType` to its corresponding value type.
 *
 * This type takes a `ParameterType` as a type parameter and returns the type
 * of the value that should be used for parameters of that type.
 *
 * @example
 * ParameterTypeToValueType<ParameterType.STRING>
 * // ^? "string"
 *
 * @example
 * ParameterTypeToValueType<ParameterType.INT>
 * // ^? "number"
 */
export type ParameterTypeToValueType<T extends ParameterType> =
  ParameterToValueTypeMap[T];

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
