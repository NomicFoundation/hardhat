import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:test",
  tasks: [
    task("test", "Runs all your tests")
      .addVariadicArgument({
        name: "testFiles",
        description: "List of specific files to run tests on",
        defaultValue: [],
      })
      .addOption({
        name: "chainType",
        description: "The chain type to use by the solidity test runner",
        defaultValue: "l1",
      })
      .addOption({
        name: "grep",
        description: "Only run tests matching the given string or regexp",
        type: ArgumentType.STRING_WITHOUT_DEFAULT,
        defaultValue: undefined,
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile the project before running the tests",
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  dependencies: [async () => (await import("../solidity/index.js")).default],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
