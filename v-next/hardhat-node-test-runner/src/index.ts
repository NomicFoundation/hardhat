import type { HardhatPlugin } from "hardhat/types/plugins";

import { task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-node-test-runner",
  tasks: [
    task(["test", "nodejs"], "Runs tests using the NodeJS test runner")
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
      .setAction(() => import("./task-action.js"))
      .build(),
  ],
  hookHandlers: {
    config: () => import("./hookHandlers/config.js"),
    test: () => import("./hookHandlers/test.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-node-test-runner",
};

export default hardhatPlugin;
