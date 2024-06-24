import type { ParameterTypeToValueType } from "../types/common.js";
import type {
  GlobalOptions,
  GlobalOption,
  GlobalOptionsMap,
} from "../types/global-options.js";
import type { HardhatPlugin } from "../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../types/common.js";

import {
  RESERVED_PARAMETER_NAMES,
  isParameterValueValid,
  isValidParamNameCasing,
} from "./parameters.js";

/**
 * Builds a map of the global options, validating them.
 *
 * Note: this function can be used before initializing the HRE, so the plugins
 * shouldn't be consider validated. Hence, we should validate the global
 * parameters.
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

export function resolveGlobalOptions(
  userProvidedGlobalOptions: Partial<GlobalOptions>,
  _globalOptionsMap: GlobalOptionsMap,
): GlobalOptions {
  // TODO: Validate the userProvidedGlobalOptions and get the remaining ones
  // from env variables

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return userProvidedGlobalOptions as GlobalOptions;
}
