import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { ArgumentType, task } from "@ignored/hardhat-vnext-core/config";

const hardhatPlugin: HardhatPlugin = {
  id: "run",
  tasks: [
    task("run", "Runs a user-defined script after compiling the project")
      .addPositionalArgument({
        name: "script",
        description: "A js or ts file to be run within hardhat's environment",
        type: ArgumentType.STRING,
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile before running this task",
      })
      .setAction(import.meta.resolve("./runScriptWithHardhat.js"))
      .build(),
  ],
};

export default hardhatPlugin;
