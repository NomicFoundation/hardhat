import type { GlobalOption } from "../types/global-options.js";

import { globalOption, ParameterType } from "../config.js";

export const BUILTIN_OPTIONS: GlobalOption[] = [
  globalOption({
    name: "config",
    description: "A Hardhat config file.",
    type: ParameterType.STRING,
    defaultValue: "",
  }),
  globalOption({
    name: "help",
    description:
      "Shows this message, or a task's help if its name is provided.",
    type: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "showStackTraces",
    description: "Show stack traces (always enabled on CI servers).",
    type: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "version",
    description: "Shows hardhat's version.",
    type: ParameterType.BOOLEAN,
    defaultValue: false,
  }),
];
