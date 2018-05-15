const { ArgumentsParser } = require("./ArgumentsParser");
const { getEnvBuidlerArguments } = require("../core/params/env-variables");
const { BUIDLER_PARAM_DEFINITIONS } = require("../core/params/buidler-params");
const types = require("../core/types");

const DEFAULT_TASK_NAME = "help";

const CLI_PARAM_DEFINITIONS = {
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
  },
  emoji: {
    name: "emoji",
    defaultValue: process.platform === "darwin",
    description: "Use emoji in messages.",
    type: types.boolean,
    isFlag: true
  }
};

function getMergedParamDefinitions() {
  const merged = {
    ...BUIDLER_PARAM_DEFINITIONS,
    ...CLI_PARAM_DEFINITIONS
  };

  const fromEnv = getEnvBuidlerArguments(merged);

  for (const [name, value] of Object.entries(fromEnv)) {
    merged[name].defaultValue = value;
  }

  return merged;
}

function getArgumentsBeforeConfig(globalParamDefinitions, rawArgs) {
  const parser = new ArgumentsParser(
    globalParamDefinitions,
    {},
    DEFAULT_TASK_NAME
  );

  return parser.parse(rawArgs);
}

function getArgumentsAfterConfig(
  globalParamDefinitions,
  taskDefinitions,
  rawArgs
) {
  const parser = new ArgumentsParser(
    globalParamDefinitions,
    taskDefinitions,
    DEFAULT_TASK_NAME
  );

  return parser.parse(rawArgs);
}

module.exports = {
  getMergedParamDefinitions,
  getArgumentsBeforeConfig,
  getArgumentsAfterConfig
};
