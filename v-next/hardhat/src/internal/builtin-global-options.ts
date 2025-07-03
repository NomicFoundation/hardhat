import type { GlobalOptionDefinitions } from "../types/global-options.js";

import { globalFlag, globalLevel, globalOption } from "../config.js";
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
          type: ArgumentType.STRING_WITHOUT_DEFAULT,
          defaultValue: undefined,
        }),
      },
    ],
    [
      "help",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "help",
          description:
            "Shows this message, or a task's help if its name is provided.",
        }),
      },
    ],
    [
      "init",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "init",
          description: "Initializes a Hardhat project.",
        }),
      },
    ],
    [
      "showStackTraces",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "showStackTraces",
          description: "Show stack traces (always enabled on CI servers).",
        }),
      },
    ],
    [
      "verbose",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "verbose",
          description: "Enables Hardhat verbose logging.",
        }),
      },
    ],
    [
      "verbosity",
      {
        pluginId: "builtin",
        option: globalLevel({
          name: "verbosity",
          shortName: "v",
          description: "Sets the verbosity level.",
        }),
      },
    ],
    [
      "version",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "version",
          description: "Shows hardhat's version.",
        }),
      },
    ],
  ]);
