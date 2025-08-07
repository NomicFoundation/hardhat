import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:console",
  tasks: [
    task("console", "Opens a hardhat console")
      .addOption({
        name: "history",
        description: "Path to a history file",
        defaultValue: "console-history.txt",
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile the project before starting the console",
      })
      .addVariadicArgument({
        name: "commands",
        description: "Commands to run when the console starts",
        defaultValue: [],
        type: ArgumentType.STRING,
      })

      .setAction({
        action: () => import("./task-action.js"),
      })
      .build(),
  ],
  dependencies: () => [import("../solidity/index.js")],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
