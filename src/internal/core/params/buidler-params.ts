import { BuidlerParamDefinitions } from "../../../types";

import * as types from "./argumentTypes";

export const BUIDLER_PARAM_DEFINITIONS: BuidlerParamDefinitions = {
  network: {
    name: "network",
    defaultValue: "develop",
    description: "The network to connect to.",
    type: types.string,
    isOptional: true,
    isFlag: false,
    isVariadic: false
  },
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show stack traces.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  version: {
    name: "version",
    defaultValue: false,
    description: "Shows buidler's version.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  help: {
    name: "help",
    defaultValue: false,
    description: "Shows this message.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  emoji: {
    name: "emoji",
    defaultValue: process.platform === "darwin",
    description: "Use emoji in messages.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  config: {
    name: "config",
    defaultValue: undefined,
    description: "A Buidler config file.",
    type: types.inputFile,
    isFlag: false,
    isOptional: true,
    isVariadic: false
  }
};
