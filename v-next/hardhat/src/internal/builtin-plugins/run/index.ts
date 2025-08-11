import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:run",
  tasks: [
    task("run", "Runs a user-defined script after compiling the project")
      .addPositionalArgument({
        name: "script",
        description: "A js or ts file to be run within hardhat's environment",
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile the project before running the script",
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
  dependencies: () => [import("../solidity/index.js")],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
