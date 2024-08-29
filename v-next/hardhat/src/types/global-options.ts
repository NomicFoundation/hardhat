import type { OptionDefinition } from "./arguments.js";

/**
 * The values of each global option for a certain instance of the Hardhat
 * Runtime Environment are defined here. This interface can be extended through
 * module augmentation to include additional global options as needed.
 *
 * Global options can be provided in several ways and are accessible through
 * the Hardhat Runtime Environment:
 *  1. Environment variables: `HARDHAT_<OPTION_NAME_WITH_THIS_CASING>`
 *  2. CLI arguments:
 *     - `--<option-name-with-this-casing> <value>` for options with values
 *     - `--<option-name-with-this-casing>` for boolean options with a false default
 *
 * CLI arguments take precedence over environment variables.
 */
export interface GlobalOptions {
  // These are the default global options, but this interface is meant to be
  // extended through module augmentation.
  config: string;
  help: boolean;
  init: boolean;
  showStackTraces: boolean;
  version: boolean;
}

/**
 * An entry in the global options map.
 * @see GlobalOptionDefinitions
 */
export interface GlobalOptionDefinitionsEntry {
  pluginId: string;
  option: OptionDefinition;
}

/**
 * A map with all the `GlobalOption`s and which plugin defined them.
 */
export type GlobalOptionDefinitions = Map<string, GlobalOptionDefinitionsEntry>;
