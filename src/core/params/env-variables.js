const { ArgumentsParser } = require("../../cli/ArgumentsParser");

const BUIDLER_ENV_ARGUMENT_PREFIX = "BUIDLER_";

function paramNameToEnvVariable(paramName) {
  // We create it starting from the result of ArgumentsParser.paramNameToCLA
  // so it's easier to explain and understand their equivalences.
  return ArgumentsParser.paramNameToCLA(paramName)
    .replace(ArgumentsParser.PARAM_PREFIX, BUIDLER_ENV_ARGUMENT_PREFIX)
    .replace("-", "_")
    .toUpperCase();
}

function getEnvBuidlerArguments(paramDefinitions) {
  const envArgs = {};

  for (const paramName of Object.keys(paramDefinitions)) {
    const definition = paramDefinitions[paramName];

    const envVarName = paramNameToEnvVariable(paramName);
    const rawValue = process.env[envVarName];

    if (rawValue !== undefined) {
      try {
        envArgs[paramName] = definition.type.parse(paramName, rawValue);
      } catch (e) {
        throw new Error(
          `Invalid environment variable ${envVarName}'s value: ${rawValue}`
        );
      }
    } else if (definition.defaultValue !== undefined) {
      envArgs[paramName] = definition.defaultValue;
    }
  }

  return envArgs;
}

module.exports = { getEnvBuidlerArguments };
