import type { HardhatPlugin } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-mocha",
  tasks: [
    task(["test", "mocha"], "Runs tests using the Mocha test runner")
      .addVariadicArgument({
        name: "testFiles",
        description: "An optional list of files to test",
        defaultValue: [],
      })
      .addFlag({
        name: "bail",
        description: "Stop running tests after the first test failure",
      })
      .addOption({
        name: "grep",
        description: "Only run tests matching the given string or regexp",
        defaultValue: "",
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
  npmPackage: "@nomicfoundation/hardhat-mocha",
};

export default hardhatPlugin;
