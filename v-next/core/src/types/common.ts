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

interface ParameterToValueTypeMap {
  [ParameterType.STRING]: string;
  [ParameterType.BOOLEAN]: boolean;
  [ParameterType.INT]: number;
  [ParameterType.BIGINT]: bigint;
  [ParameterType.FLOAT]: number;
  [ParameterType.FILE]: string;
}

/**
 * Maps a `ParameterType` to its corresponding value type.
 *
 * This type takes a `ParameterType` as a type parameter and returns the type
 * of the value that should be used for parameters of that type.
 *
 * For example, `ParameterTypeToValueType<ParameterType.STRING>` would be
 * `string`, and `ParameterTypeToValueType<ParameterType.INT>` would be `number`.
 */
export type ParameterTypeToValueType<T extends ParameterType> =
  ParameterToValueTypeMap[T];
