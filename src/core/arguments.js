"use strict";

const types = require("../arguments-parsing/types");
const { Parser } = require("../arguments-parsing/Parser");

const BUIDLER_ENV_ARGUMENT_PREFIX = "BUIDLER_";

const BUIDLER_PARAM_DEFINITIONS = {
  network: {
    name: "network",
    defaultValue: "auto",
    description:
      "The network to connect to. See buidler's config documentation for more info.",
    type: types.string
  },
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show buidler's errors' stack traces.",
    type: types.boolean,
    isFlag: true
  },
  version: {
    name: "version",
    defaultValue: false,
    description: "Show's buidler's version.",
    type: types.boolean,
    isFlag: true
  },
  help: {
    name: "help",
    defaultValue: false,
    description: "Show's buidler's help.",
    type: types.boolean,
    isFlag: true
  }
};

function getEnvBuidlerArguments() {
  const envArgs = {};

  for (const paramName in BUIDLER_PARAM_DEFINITIONS) {
    const definition = BUIDLER_PARAM_DEFINITIONS[paramName];

    const envVarName = BUIDLER_ENV_ARGUMENT_PREFIX + paramName.toUpperCase();
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
    BUIDLER_PARAM_DEFINITIONS,
    taskDefinitions,
    defaultTaskName
  );
  return parser.parse(rawCommandLineArgs);
}

module.exports = {
  getEnvBuidlerArguments,
  parseArguments,
  BUIDLER_PARAM_DEFINITIONS
};
