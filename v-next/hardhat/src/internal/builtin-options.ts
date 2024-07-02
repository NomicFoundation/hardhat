import type { GlobalOption } from "../types/global-options.js";

import { globalOption, ParameterType } from "../config.js";

export const BUILTIN_OPTIONS: GlobalOption[] = [
  globalOption({
    name: "config",
    description: "A Hardhat config file.",
    parameterType: ParameterType.STRING,
    defaultValue: "",
  }),
  globalOption({
    name: "help",
    description:
      "Shows this message, or a task's help if its name is provided.",
    parameterType: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "showStackTraces",
    description: "Show stack traces (always enabled on CI servers).",
    parameterType: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "version",
    description: "Shows hardhat's version.",
    parameterType: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
];
