import type { GlobalOptionDefinitions } from "../types/global-options.js";

import { globalFlag, globalLevel, globalOption } from "../config.js";
import { ArgumentType } from "../types/arguments.js";

import { DEFAULT_VERBOSITY } from "./constants.js";

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
          shortName: "h",
          description:
            "Show this message, or a task's help if its name is provided.",
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
      "verbosity",
      {
        pluginId: "builtin",
        option: globalLevel({
          name: "verbosity",
          shortName: "v",
          description: "Verbosity level of the output.",
          defaultValue: DEFAULT_VERBOSITY,
        }),
      },
    ],
    [
      "version",
      {
        pluginId: "builtin",
        option: globalFlag({
          name: "version",
          description: "Show the version of hardhat.",
        }),
      },
    ],
  ]);
