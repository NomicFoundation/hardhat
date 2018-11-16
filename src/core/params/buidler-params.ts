import types from "../types";

export const BUIDLER_PARAM_DEFINITIONS = {
  network: {
    name: "network",
    defaultValue: "auto",
    description: "The network to connect to.",
    type: types.string,
    isOptional: true
  }
};

export const BUIDLER_CLI_PARAM_DEFINITIONS = {
  ...BUIDLER_PARAM_DEFINITIONS,
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show buidler's errors' stack traces.",
    type: types.boolean,
    isFlag: true,
    isOptional: true
  },
  version: {
    name: "version",
    defaultValue: false,
    description: "Show's buidler's version.",
    type: types.boolean,
    isFlag: true,
    isOptional: true
  },
  help: {
    name: "help",
    defaultValue: false,
    description: "Show's buidler's help.",
    type: types.boolean,
    isFlag: true,
    isOptional: true
  },
  emoji: {
    name: "emoji",
    defaultValue: process.platform === "darwin",
    description: "Use emoji in messages.",
    type: types.boolean,
    isFlag: true,
    isOptional: true
  }
};
