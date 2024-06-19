import type { ParameterTypeToValueType } from "../types/common.js";
import type {
  GlobalArguments,
  GlobalParameter,
  GlobalParametersMap,
} from "../types/global-parameters.js";
import type { HardhatPlugin } from "../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../types/common.js";

import {
  RESERVED_PARAMETER_NAMES,
  isParameterValueValid,
  isValidParamNameCasing,
} from "./parameters.js";

/**
 * Builds a map of the global parameters, validating them.
 *
 * Note: this function can be used before initializing the HRE, so the plugins
 * shouldn't be consider validated. Hence, we should validate the global
 * parameters.
 */
export function buildGlobalParametersMap(
  resolvedPlugins: HardhatPlugin[],
): GlobalParametersMap {
  const globalParametersMap: GlobalParametersMap = new Map();

  for (const plugin of resolvedPlugins) {
    if (plugin.globalParameters === undefined) {
      continue;
    }

    for (const param of plugin.globalParameters) {
      const existingByName = globalParametersMap.get(param.name);
      if (existingByName !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.GENERAL.GLOBAL_PARAMETER_ALREADY_DEFINED,
          {
            plugin: plugin.id,
            globalParameter: param.name,
            definedByPlugin: existingByName.pluginId,
          },
        );
      }

      const validatedGlobalParam = buildGlobalParameterDefinition(param);

      const mapEntry = {
        pluginId: plugin.id,
        param: validatedGlobalParam,
      };

      globalParametersMap.set(validatedGlobalParam.name, mapEntry);
    }
  }

  return globalParametersMap;
}

export function buildGlobalParameterDefinition<T extends ParameterType>({
  name,
  description,
  parameterType,
  defaultValue,
}: {
  name: string;
  description: string;
  parameterType?: T;
  defaultValue: ParameterTypeToValueType<T>;
}): GlobalParameter {
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

export function resolveGlobalArguments(
  userProvidedGlobalArguments: Partial<GlobalArguments>,
  _globalParametersMap: GlobalParametersMap,
): GlobalArguments {
  // TODO: Validate the userProvidedGlobalArguments and get the remaining ones
  // from env variables

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return userProvidedGlobalArguments as GlobalArguments;
}
