import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { task } from "@ignored/hardhat-vnext-core/config";

const hardhatPlugin: HardhatPlugin = {
  id: "console",
  tasks: [
    task("console", "Opens a hardhat console")
      .setAction(import.meta.resolve("./task-action.js"))
      .addOption({
        name: "history",
        description: "Path to a history file",
        defaultValue: "console-history.txt",
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile before running this task",
      })
      .addVariadicArgument({
        name: "commands",
        description: "Commands to run in the console",
        defaultValue: [".help"],
      })
      .build(),
  ],
};

export default hardhatPlugin;
