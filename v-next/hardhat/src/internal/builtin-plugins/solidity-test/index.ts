import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity-tests",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
  },
  tasks: [
    task(["test", "solidity"], "Run the Solidity tests")
      .setAction(import.meta.resolve("./task-action.js"))
      .addFlag({
        name: "force",
        description: "Force compilation even if no files have changed",
      })
      .addFlag({
        name: "quiet",
        description: "Makes the compilation process less verbose",
      })
      .build(),
  ],
  dependencies: [
    async () => {
      const { default: solidityBuiltinPlugin } = await import(
        "../solidity/index.js"
      );
      return solidityBuiltinPlugin;
    },
    async () => {
      const { default: testBuiltinPlugin } = await import("../test/index.js");
      return testBuiltinPlugin;
    },
  ],
  npmPackage: "@ignored/hardhat-vnext",
};

export default hardhatPlugin;
