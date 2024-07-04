import type {
  ArgumentTypeToValueType,
  ArgumentValue,
} from "../types/arguments.js";
import type {
  GlobalOptions,
  GlobalOption,
  GlobalOptionDefinitions,
} from "../types/global-options.js";
import type { HardhatPlugin } from "../types/plugins.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { camelToSnakeCase } from "@ignored/hardhat-vnext-utils/string";

import { ArgumentType } from "../types/arguments.js";

import {
  RESERVED_ARGUMENT_NAMES,
  isArgumentValueValid,
  isArgumentNameValid,
  parseArgumentValue,
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
          HardhatError.ERRORS.GENERAL.GLOBAL_OPTION_ALREADY_DEFINED,
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
export function buildGlobalOptionDefinition<T extends ArgumentType>({
  name,
  description,
  type,
  defaultValue,
}: {
  name: string;
  description: string;
  type?: T;
  defaultValue: ArgumentTypeToValueType<T>;
}): GlobalOption {
  const parameterType = type ?? ArgumentType.STRING;

  if (!isArgumentNameValid(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
      name,
    });
  }

  if (RESERVED_ARGUMENT_NAMES.has(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
      name,
    });
  }

  if (!isArgumentValueValid(parameterType, defaultValue)) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: defaultValue,
        name: "defaultValue",
        type,
      },
    );
  }

  return {
    name,
    description,
    type: parameterType,
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
 * {@link HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE} if a user-provided
 * option has an invalid value for its type.
 */
export function resolveGlobalOptions(
  userProvidedGlobalOptions: Partial<GlobalOptions>,
  globalOptionDefinitions: GlobalOptionDefinitions,
): GlobalOptions {
  const globalOptions: GlobalOptions = {};
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

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- GlobalOptions is empty for user extension, so we need to cast it to
      assign the value. */
    (globalOptions as Record<string, ArgumentValue>)[name] = parsedValue;
  }

  return globalOptions;
}
