import type {
  ParameterTypeToValueType,
  ParameterValue,
} from "../types/common.js";
import type {
  GlobalOptions,
  GlobalOption,
  GlobalOptionsMap,
} from "../types/global-options.js";
import type { HardhatPlugin } from "../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { camelToSnakeCase } from "@nomicfoundation/hardhat-utils/string";

import { ParameterType } from "../types/common.js";

import {
  RESERVED_PARAMETER_NAMES,
  isParameterValueValid,
  isValidParamNameCasing,
  parseParameterValue,
} from "./parameters.js";

/**
 * Builds a map of the global option definitions by going through all the
 * plugins and validating the global options they define.
 *
 * Note: this function can be used before initializing the HRE, so the plugins
 * shouldn't be consider validated. Hence, we should validate the global
 * options.
 */
export function buildGlobalOptionsMap(
  resolvedPlugins: HardhatPlugin[],
): GlobalOptionsMap {
  const globalOptionsMap: GlobalOptionsMap = new Map();

  for (const plugin of resolvedPlugins) {
    if (plugin.globalOptions === undefined) {
      continue;
    }

    for (const option of plugin.globalOptions) {
      const existingByName = globalOptionsMap.get(option.name);
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

      globalOptionsMap.set(validatedGlobalOption.name, mapEntry);
    }
  }

  return globalOptionsMap;
}

/**
 * Builds a global option definition, validating the name, type, and default
 * value.
 */
export function buildGlobalOptionDefinition<T extends ParameterType>({
  name,
  description,
  parameterType,
  defaultValue,
}: {
  name: string;
  description: string;
  parameterType?: T;
  defaultValue: ParameterTypeToValueType<T>;
}): GlobalOption {
  const type = parameterType ?? ParameterType.STRING;

  if (!isValidParamNameCasing(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
      name,
    });
  }

  if (RESERVED_PARAMETER_NAMES.has(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
      name,
    });
  }

  if (!isParameterValueValid(type, defaultValue)) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: defaultValue,
        name: "defaultValue",
        type: parameterType,
      },
    );
  }

  return {
    name,
    description,
    parameterType: type,
    defaultValue,
  };
}

/**
 * Resolves global options by merging user-provided options with environment
 * variables, adhering to predefined global option definitions. This function
 * ensures that only options specified in the globalOptionsMap are considered.
 * Each option is validated against its definition in the map, with
 * user-provided options taking precedence over environment variables. If an
 * option is not provided by the user or set as an environment variable, its
 * default value (as specified in the globalOptionsMap) is used.
 *
 * @param userProvidedGlobalOptions The options explicitly provided by the
 * user. These take precedence over equivalent environment variables.
 * @param globalOptionsMap A map defining valid global options, their default
 * values, and expected types. This map is used to validate and parse the options.
 * @returns {GlobalOptions} An object containing the resolved global options,
 * with each option adhering to its definition in the globalOptionsMap.
 * @throws {HardhatError} with descriptor
 * {@link HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE} if a user-provided
 * option has an invalid value for its type.
 */
export function resolveGlobalOptions(
  userProvidedGlobalOptions: Partial<GlobalOptions>,
  globalOptionsMap: GlobalOptionsMap,
): GlobalOptions {
  const globalOptions: GlobalOptions = {};
  // iterate over the definitions to parse and validate the arguments
  for (const [name, { option }] of globalOptionsMap) {
    let value =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- GlobalOptions is empty for user extension, so we need to cast it to
      assign the value. */
      (userProvidedGlobalOptions as Record<string, string | undefined>)[name];

    let parsedValue: ParameterValue;
    // if the value is provided in the user options, it's already parsed
    // and it takes precedence over env vars
    if (value !== undefined) {
      parsedValue = value;
    } else {
      value = process.env[`HARDHAT_${camelToSnakeCase(name).toUpperCase()}`];
      if (value !== undefined) {
        // if the value is provided via an env var, it needs to be parsed
        parsedValue = parseParameterValue(value, option.parameterType, name);
      } else {
        // if the value is not provided by the user or env var, use the default
        parsedValue = option.defaultValue;
      }
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- GlobalOptions is empty for user extension, so we need to cast it to
      assign the value. */
    (globalOptions as Record<string, ParameterValue>)[name] = parsedValue;
  }

  return globalOptions;
}
