import type { HardhatPlugin } from "@nomicfoundation/hardhat-core/types/plugins";

import { ParameterType, task } from "@nomicfoundation/hardhat-core/config";

export default {
  id: "run",
  tasks: [
    task("run", "Runs a user-defined script after compiling the project")
      .addPositionalParameter({
        name: "script",
        description: "A js or ts file to be run within hardhat's environment",
        type: ParameterType.STRING,
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile before running this task",
      })
      .setAction(import.meta.resolve("./runScriptWithHardhat.js"))
      .build(),
  ],
} satisfies HardhatPlugin;
