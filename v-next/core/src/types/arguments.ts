/**
 * The possible types of a global or task option.
 */
export enum ArgumentType {
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  INT = "INT",
  BIGINT = "BIGINT",
  FLOAT = "FLOAT",
  FILE = "FILE",
}

/**
 * Maps all the `ArgumentType` values to their corresponding value types.
 */
export interface ArgumentValueTypes {
  [ArgumentType.STRING]: string;
  [ArgumentType.BOOLEAN]: boolean;
  [ArgumentType.INT]: number;
  [ArgumentType.BIGINT]: bigint;
  [ArgumentType.FLOAT]: number;
  [ArgumentType.FILE]: string;
}

/**
 * All the possible values for an argument.
 */
export type ArgumentValue = ArgumentValueTypes[keyof ArgumentValueTypes];

/**
 * Maps a `ArgumentType` to its corresponding value type.
 *
 * This type takes a `ArgumentType` as a type parameter and returns the type
 * of the value that should be used for arguments of that type.
 *
 * @example
 * ArgumentTypeToValueType<ArgumentType.STRING>
 * // ^? "string"
 *
 * @example
 * ArgumentTypeToValueType<ArgumentType.INT>
 * // ^? "number"
 */
export type ArgumentTypeToValueType<T extends ArgumentType> =
  ArgumentValueTypes[T];
