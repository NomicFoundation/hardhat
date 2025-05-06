import type {
  ArgumentTypeToValueType,
  ArgumentValue,
  OptionDefinition,
} from "../../types/arguments.js";
import type {
  GlobalOptions,
  GlobalOptionDefinitions,
} from "../../types/global-options.js";
import type { HardhatPlugin } from "../../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { camelToSnakeCase } from "@nomicfoundation/hardhat-utils/string";

import { ArgumentType } from "../../types/arguments.js";

import {
  parseArgumentValue,
  validateArgumentValue,
  validateArgumentName,
} from "./arguments.js";

/**
 * Builds a map of the global option definitions by going through all the
 * plugins and validating the global options they define.
 *
 * Note: this function can be used before initializing the HRE, so the plugins
 * shouldn't be consider validated. Hence, we should validate the global
 * options.
 */
export function buildGlobalOptionDefinitions(
  resolvedPlugins: HardhatPlugin[],
): GlobalOptionDefinitions {
  const globalOptionDefinitions: GlobalOptionDefinitions = new Map();

  for (const plugin of resolvedPlugins) {
    if (plugin.globalOptions === undefined) {
      continue;
    }

    for (const option of plugin.globalOptions) {
      const existingByName = globalOptionDefinitions.get(option.name);
      if (existingByName !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.GENERAL.GLOBAL_OPTION_ALREADY_DEFINED,
          {
            plugin: plugin.id,
            globalOption: option.name,
            definedByPlugin: existingByName.pluginId,
          },
        );
      }

      const validatedGlobalOption = buildGlobalOptionDefinition(option);

      const mapEntry = {
        pluginId: plugin.id,
        option: validatedGlobalOption,
      };

      globalOptionDefinitions.set(validatedGlobalOption.name, mapEntry);
    }
  }

  return globalOptionDefinitions;
}

/**
 * Builds a global option definition, validating the name, type, and default
 * value.
 */
export function buildGlobalOptionDefinition<
  T extends ArgumentType = ArgumentType.STRING,
>({
  name,
  description,
  type,
  defaultValue,
}: {
  name: string;
  description: string;
  type?: T;
  defaultValue: ArgumentTypeToValueType<T>;
}): OptionDefinition {
  const argumentType = type ?? ArgumentType.STRING;

  validateArgumentName(name);

  validateArgumentValue("defaultValue", argumentType, defaultValue);

  return {
    name,
    description,
    type: argumentType,
    defaultValue,
  };
}

/**
 * Resolves global options by merging user-provided options with environment
 * variables, adhering to predefined global option definitions. This function
 * ensures that only options specified in the globalOptionDefinitions are
 * considered. Each option is validated against its definition in the map, with
 * user-provided options taking precedence over environment variables. If an
 * option is not provided by the user or set as an environment variable, its
 * default value (as specified in the globalOptionDefinitions) is used.
 *
 * @param userProvidedGlobalOptions The options explicitly provided by the
 * user. These take precedence over equivalent environment variables.
 * @param globalOptionDefinitions A map defining valid global options, their default
 * values, and expected types. This map is used to validate and parse the options.
 * @returns {GlobalOptions} An object containing the resolved global options,
 * with each option adhering to its definition in the globalOptionDefinitions.
 * @throws {HardhatError} with descriptor
 * {@link HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE} if a user-provided
 * option has an invalid value for its type.
 */
export function resolveGlobalOptions(
  userProvidedGlobalOptions: Partial<GlobalOptions>,
  globalOptionDefinitions: GlobalOptionDefinitions,
): GlobalOptions {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We start with an empty object, and incrementally build a safe GlobalOptions */
  const globalOptions = {} as GlobalOptions;
  // iterate over the definitions to parse and validate the arguments
  for (const [name, { option }] of globalOptionDefinitions) {
    let value =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- GlobalOptions is empty for user extension, so we need to cast it to
      assign the value. */
      (userProvidedGlobalOptions as Record<string, string | undefined>)[name];

    let parsedValue: ArgumentValue;
    // if the value is provided in the user options, it's already parsed
    // and it takes precedence over env vars
    if (value !== undefined) {
      parsedValue = value;
    } else {
      value = process.env[`HARDHAT_${camelToSnakeCase(name).toUpperCase()}`];
      if (value !== undefined) {
        // if the value is provided via an env var, it needs to be parsed
        parsedValue = parseArgumentValue(value, option.type, name);
      } else {
        // if the value is not provided by the user or env var, use the default
        parsedValue = option.defaultValue;
      }
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    This operation is unsafe, because the GlobalOptions type is augmented by
    plugins. */
    (globalOptions as any)[name] = parsedValue;
  }

  return globalOptions;
}
