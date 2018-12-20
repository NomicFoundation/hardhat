import { OptionalParamDefinition } from "../tasks/task-definitions";

import * as types from "./argumentTypes";

export interface BuidlerArguments {
  network: string;
  showStackTraces: boolean;
  version: boolean;
  help: boolean;
  emoji: boolean;
}

export type BuidlerParamDefinitons = {
  [param in keyof BuidlerArguments]: OptionalParamDefinition<
    BuidlerArguments[param]
  >
};

export const BUIDLER_PARAM_DEFINITIONS: BuidlerParamDefinitons = {
  network: {
    name: "network",
    defaultValue: "auto",
    description: "The network to connect to.",
    type: types.string,
    isOptional: true,
    isFlag: false,
    isVariadic: false
  },
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show buidler's errors' stack traces.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  version: {
    name: "version",
    defaultValue: false,
    description: "Show's buidler's version.",
    type: types.boolean,
    isFlag: true,
    isOptional: true,
    isVariadic: false
  },
  help: {
    name: "help",
    defaultValue: false,
    description: "Show's buidler's help.",
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
  }
};
