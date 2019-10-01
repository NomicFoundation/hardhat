import ProcessEnv = NodeJS.ProcessEnv;

import { BuidlerArguments, BuidlerParamDefinitions } from "../../../types";
import { ArgumentsParser } from "../../cli/ArgumentsParser";
import { unsafeObjectKeys } from "../../util/unsafe";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

const BUIDLER_ENV_ARGUMENT_PREFIX = "BUIDLER_";

export function paramNameToEnvVariable(paramName: string): string {
  // We create it starting from the result of ArgumentsParser.paramNameToCLA
  // so it's easier to explain and understand their equivalences.
  return ArgumentsParser.paramNameToCLA(paramName)
    .replace(ArgumentsParser.PARAM_PREFIX, BUIDLER_ENV_ARGUMENT_PREFIX)
    .replace(/-/g, "_")
    .toUpperCase();
}

export function getEnvVariablesMap(
  buidlerArguments: BuidlerArguments
): { [envVar: string]: string } {
  const values: { [envVar: string]: string } = {};

  for (const [name, value] of Object.entries(buidlerArguments)) {
    if (value === undefined) {
      continue;
    }

    values[paramNameToEnvVariable(name)] = value.toString();
  }

  return values;
}

export function getEnvBuidlerArguments(
  paramDefinitions: BuidlerParamDefinitions,
  envVariables: ProcessEnv
): BuidlerArguments {
  const envArgs: any = {};

  for (const paramName of unsafeObjectKeys(paramDefinitions)) {
    const definition = paramDefinitions[paramName];
    const envVarName = paramNameToEnvVariable(paramName);
    const rawValue = envVariables[envVarName];

    if (rawValue !== undefined) {
      try {
        envArgs[paramName] = definition.type.parse(paramName, rawValue);
      } catch (error) {
        throw new BuidlerError(
          ERRORS.ARGUMENTS.INVALID_ENV_VAR_VALUE,
          {
            varName: envVarName,
            value: rawValue
          },
          error
        );
      }
    } else {
      envArgs[paramName] = definition.defaultValue;
    }
  }

  delete envArgs.config;

  // TODO: This is a little type-unsafe, but we know we have all the needed arguments
  return envArgs as BuidlerArguments;
}
