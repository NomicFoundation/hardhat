import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { task } from "@ignored/hardhat-vnext-core/config";

const hardhatPlugin: HardhatPlugin = {
  id: "console",
  tasks: [
    task("console", "Opens a hardhat console")
      .setAction(import.meta.resolve("./task-action.js"))
      .addVariadicArgument({
        name: "commands",
        description: "Commands to run in the console",
        defaultValue: [".help"],
      })
      .build(),
  ],
};

export default hardhatPlugin;
