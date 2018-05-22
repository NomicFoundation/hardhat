"use strict";

const types = require("../types");

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

module.exports = {
  BUIDLER_PARAM_DEFINITIONS,
  BUIDLER_CLI_PARAM_DEFINITIONS
};
