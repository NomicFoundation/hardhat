const { ArgumentsParser } = require("./ArgumentsParser");

const {
  getCliParamsWithDefaultFromEnvVariables
} = require("../core/params/buidler-params");

const DEFAULT_TASK_NAME = "help";

function getArgumentsBeforeConfig(rawArgs) {
  const parser = new ArgumentsParser(
    getCliParamsWithDefaultFromEnvVariables(),
    {},
    DEFAULT_TASK_NAME
  );

  return parser.parse(rawArgs);
}

function getArgumentsAfterConfig(taskDefinitions, rawArgs) {
  const parser = new ArgumentsParser(
    getCliParamsWithDefaultFromEnvVariables(),
    taskDefinitions,
    DEFAULT_TASK_NAME
  );

  return parser.parse(rawArgs);
}

module.exports = {
  getArgumentsBeforeConfig,
  getArgumentsAfterConfig
};
