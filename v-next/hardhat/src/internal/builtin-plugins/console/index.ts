import type { HardhatPlugin } from "../../../types/plugins.js";

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
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
  dependencies: () => [import("../solidity/index.js")],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
