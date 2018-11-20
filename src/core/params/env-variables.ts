import { ArgumentsParser } from "../../cli/ArgumentsParser";
import { BuidlerError, ERRORS } from "../errors";

import { BuidlerArguments, BuidlerParamDefinitons } from "./buidler-params";
import { unsafeObjectKeys } from "../../util/unsafe";

const BUIDLER_ENV_ARGUMENT_PREFIX = "BUIDLER_";

export function paramNameToEnvVariable(paramName: string): string {
  // We create it starting from the result of ArgumentsParser.paramNameToCLA
  // so it's easier to explain and understand their equivalences.
  return ArgumentsParser.paramNameToCLA(paramName)
    .replace(ArgumentsParser.PARAM_PREFIX, BUIDLER_ENV_ARGUMENT_PREFIX)
    .replace("-", "_")
    .toUpperCase();
}

export function getEnvBuidlerArguments(
  paramDefinitions: BuidlerParamDefinitons
): BuidlerArguments {
  const envArgs: Partial<BuidlerArguments> = {};

  for (const paramName of unsafeObjectKeys(paramDefinitions)) {
    const definition = paramDefinitions[paramName];
    const envVarName = paramNameToEnvVariable(paramName);
    const rawValue = process.env[envVarName];

    if (rawValue !== undefined) {
      try {
        envArgs[paramName] = definition.type.parse(paramName, rawValue);
      } catch (error) {
        throw new BuidlerError(
          ERRORS.ENV_VARIABLE_ARG_INVALID_VALUE,
          error,
          envVarName,
          rawValue
        );
      }
    } else if (definition.isOptional) {
      envArgs[paramName] = definition.defaultValue;
    }
  }

  // TODO: This is a little type-unsafe, but we know we have all the needed
  // arguments
  return envArgs as BuidlerArguments;
}
