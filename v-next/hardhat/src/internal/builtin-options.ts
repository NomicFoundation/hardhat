import type { GlobalOptionDefinition } from "../types/global-options.js";

import { globalOption, ArgumentType } from "../config.js";

export const BUILTIN_OPTIONS: GlobalOptionDefinition[] = [
  globalOption({
    name: "config",
    description: "A Hardhat config file.",
    type: ArgumentType.STRING,
    defaultValue: "",
  }),
  globalOption({
    name: "help",
    description:
      "Shows this message, or a task's help if its name is provided.",
    type: ArgumentType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "showStackTraces",
    description: "Show stack traces (always enabled on CI servers).",
    type: ArgumentType.BOOLEAN,
    defaultValue: false,
  }),
  globalOption({
    name: "version",
    description: "Shows hardhat's version.",
    type: ArgumentType.BOOLEAN,
    defaultValue: false,
  }),
];
