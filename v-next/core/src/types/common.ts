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
