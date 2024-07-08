import type { GlobalOptionDefinitions } from "../types/global-options.js";

import { globalOption, ArgumentType } from "../config.js";

export const BUILTIN_GLOBAL_OPTIONS_DEFINITIONS: GlobalOptionDefinitions =
  new Map([
    [
      "config",
      {
        pluginId: "hardhat",
        option: globalOption({
          name: "config",
          description: "A Hardhat config file.",
          type: ArgumentType.STRING,
          defaultValue: "",
        }),
      },
    ],
    [
      "help",
      {
        pluginId: "hardhat",
        option: globalOption({
          name: "help",
          description:
            "Shows this message, or a task's help if its name is provided.",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
    [
      "showStackTraces",
      {
        pluginId: "hardhat",
        option: globalOption({
          name: "showStackTraces",
          description: "Show stack traces (always enabled on CI servers).",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
    [
      "version",
      {
        pluginId: "hardhat",
        option: globalOption({
          name: "version",
          description: "Shows hardhat's version.",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
  ]);
