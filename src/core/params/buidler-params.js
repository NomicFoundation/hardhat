"use strict";

const types = require("../types");
const {getEnvBuidlerArguments} = require("./env-variables");

const BUIDLER_PARAM_DEFINITIONS = {
  network: {
    name: "network",
    defaultValue: "auto",
    description:
      "The network to connect to. See buidler's config documentation for more info.",
    type: types.string
  }
};

const BUIDLER_CLI_PARAM_DEFINITIONS = {
  ...BUIDLER_PARAM_DEFINITIONS,
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

function getCliParamsWithDefaultFromEnvVariables() {
  const fromEnv = getEnvBuidlerArguments(BUIDLER_CLI_PARAM_DEFINITIONS);

  for (const [name, value] of Object.entries(fromEnv)) {
    BUIDLER_CLI_PARAM_DEFINITIONS[name].defaultValue = value;
  }

  return BUIDLER_CLI_PARAM_DEFINITIONS;
}

module.exports = {
  getCliParamsWithDefaultFromEnvVariables,
  BUIDLER_PARAM_DEFINITIONS,
  BUIDLER_CLI_PARAM_DEFINITIONS
};
