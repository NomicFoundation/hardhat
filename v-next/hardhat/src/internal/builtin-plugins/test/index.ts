import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:test",
  tasks: [
    task("test", "Runs all your tests")
      .addFlag({
        name: "noCompile",
        description: "Don't compile the project before running the tests",
      })
      .addVariadicArgument({
        name: "testFiles",
        description: "List of specific files to run tests on",
        defaultValue: [],
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  dependencies: [
    async () => {
      const { default: solidityBuiltinPlugin } = await import(
        "../solidity/index.js"
      );
      return solidityBuiltinPlugin;
    },
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
