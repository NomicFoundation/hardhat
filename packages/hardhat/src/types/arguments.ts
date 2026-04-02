/**
 * The possible types of a global or task option.
 */
export enum ArgumentType {
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  FLAG = "FLAG",
  INT = "INT",
  LEVEL = "LEVEL",
  BIGINT = "BIGINT",
  FLOAT = "FLOAT",
  FILE = "FILE",
  STRING_WITHOUT_DEFAULT = "STRING_WITHOUT_DEFAULT",
  FILE_WITHOUT_DEFAULT = "FILE_WITHOUT_DEFAULT",
}

/**
 * Maps all the `ArgumentType` values to their corresponding value types.
 */
export interface ArgumentValueTypes {
  [ArgumentType.STRING]: string;
  [ArgumentType.BOOLEAN]: boolean;
  [ArgumentType.FLAG]: boolean;
  [ArgumentType.INT]: number;
  [ArgumentType.LEVEL]: number;
  [ArgumentType.BIGINT]: bigint;
  [ArgumentType.FLOAT]: number;
  [ArgumentType.FILE]: string;
  [ArgumentType.STRING_WITHOUT_DEFAULT]: string | undefined;
  [ArgumentType.FILE_WITHOUT_DEFAULT]: string | undefined;
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

/**
 * Options in CLI are specified as `--<name> value`, where `--<name>` is the
 * option's name and `value` is the argument it takes. For example,
 * `--network mainnet` sets the network option to `mainnet`.
 *
 * Options can also be flags, which are boolean options that don't take an
 * argument. For example, `--help` is a flag that shows the help message.
 *
 * Options are always optional and can be provided in any order.
 */
export interface OptionDefinition<T extends ArgumentType = ArgumentType> {
  name: string;
  shortName?: string;
  description: string;
  type: T;
  defaultValue: ArgumentTypeToValueType<T>;
  hidden?: boolean;
}

/**
 * A global option is essentially identical to a regular OptionDefinition,
 * except that it cannot be hidden.
 */
export type GlobalOptionDefinition<T extends ArgumentType = ArgumentType> =
  Omit<OptionDefinition<T>, "hidden">;

/**
 * A positional argument is used as `<value>` in the CLI, where its position
 * matters. For example, `mv <from> <to>` has two positional arguments.
 *
 * If the argument is variadic, it accepts multiple values. A variadic argument
 * must be the last positional argument and consumes all remaining values.
 */
export interface PositionalArgumentDefinition<
  T extends ArgumentType = ArgumentType,
> {
  name: string;
  description: string;
  type: T;
  defaultValue?: ArgumentTypeToValueType<T> | Array<ArgumentTypeToValueType<T>>;
  isVariadic: boolean;
}
