import type { HardhatPlugin } from "hardhat/types/plugins";

import { task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-node-test-runner",
  tasks: [
    task(["test", "node"], "Runs tests using the NodeJS test runner")
      .addVariadicArgument({
        name: "testFiles",
        description: "An optional list of files to test",
        defaultValue: [],
      })
      .addFlag({
        name: "only",
        description: "Run all tests marked with .only",
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
  hookHandlers: {
    config: import.meta.resolve("./hookHandlers/config.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-node-test-runner",
};

export default hardhatPlugin;
