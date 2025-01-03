import type { GlobalOptionDefinitions } from "../types/global-options.js";

import { globalOption } from "../config.js";
import { ArgumentType } from "../types/arguments.js";

export const BUILTIN_GLOBAL_OPTIONS_DEFINITIONS: GlobalOptionDefinitions =
  new Map([
    [
      "config",
      {
        pluginId: "builtin",
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
        pluginId: "builtin",
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
      "init",
      {
        pluginId: "builtin",
        option: globalOption({
          name: "init",
          description: "Initializes a Hardhat project.",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
    [
      "showStackTraces",
      {
        pluginId: "builtin",
        option: globalOption({
          name: "showStackTraces",
          description: "Show stack traces (always enabled on CI servers).",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
    [
      "verbose",
      {
        pluginId: "builtin",
        option: globalOption({
          name: "verbose",
          description: "Enables Hardhat verbose logging.",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
    [
      "version",
      {
        pluginId: "builtin",
        option: globalOption({
          name: "version",
          description: "Shows hardhat's version.",
          type: ArgumentType.BOOLEAN,
          defaultValue: false,
        }),
      },
    ],
  ]);
