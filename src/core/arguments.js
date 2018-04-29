const types = require("../arguments-parsing/types");
const Parser = require("../arguments-parsing/Parser").Parser;

const SOOL_ENV_ARGUMENT_PREFIX = "SOOL_";

const SOOL_PARAM_DEFINITIONS = {
  network: {
    name: "network",
    defaultValue: "auto",
    description:
      "The network to connect to. See sool's config documentation for more info.",
    type: types.string
  },
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show sool's errors' stack traces.",
    type: types.boolean
  }
};

function getEnvSoolArguments() {
  const envArgs = {};

  for (const paramName in SOOL_PARAM_DEFINITIONS) {
    const definition = SOOL_PARAM_DEFINITIONS[paramName];

    const envVarName = SOOL_ENV_ARGUMENT_PREFIX + paramName.toUpperCase();
    const rawValue = process.env[envVarName];

    if (rawValue !== undefined) {
      try {
        envArgs[paramName] = definition.type(paramName, rawValue);
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

function parseArguments(taskDefinitions, defaultTaskName, rawCommandLineArgs) {
  const parser = new Parser(
    SOOL_PARAM_DEFINITIONS,
    taskDefinitions,
    defaultTaskName
  );
  return parser.parse(rawCommandLineArgs);
}

module.exports = {
  getEnvSoolArguments,
  parseArguments,
  SOOL_PARAM_DEFINITIONS
};
