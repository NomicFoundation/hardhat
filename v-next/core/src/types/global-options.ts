import type { ArgumentType, ArgumentTypeToValueType } from "./arguments.js";

/**
 * A global option with an associated value and a default if not provided by
 * the user. They are available in the Hardhat Runtime Environment.
 *
 * They can be provided in these different ways:
 *  1. Through environment variables, with the format
 *     `HARDHAT_<OPTION_NAME_WITH_THIS_CASING>`.
 *  2. Through the CLI with the format `--<option-name-with-this-casing> <value>`.
 *    2.1. Through the CLI with the format `--<option-name-with-this-casing>` if
 *      the option is boolean and its default value is `false`.
 *
 * If both are present, the second one takes precedence.
 */
export interface GlobalOptionDefinition<T extends ArgumentType = ArgumentType> {
  name: string;
  description: string;
  type: ArgumentType;
  defaultValue: ArgumentTypeToValueType<T>;
}

/**
 * The values of each global option for a certain instance of the Hardhat
 * Runtime Environment.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface -- To be used through module augmentation
export interface GlobalOptions {}

/**
 * An entry in the global options map.
 * @see GlobalOptionDefinitions
 */
export interface GlobalOptionDefinitionsEntry {
  pluginId: string;
  option: GlobalOptionDefinition;
}

/**
 * A map with all the `GlobalOption`s and which plugin defined them.
 */
export type GlobalOptionDefinitions = Map<string, GlobalOptionDefinitionsEntry>;
