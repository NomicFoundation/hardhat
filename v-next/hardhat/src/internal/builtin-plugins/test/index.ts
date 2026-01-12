import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { DEFAULT_VERBOSITY } from "../../constants.js";
import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:test",
  hookHandlers: {
    config: () => import("./hook-handlers/config.js"),
  },
  tasks: [
    task("test", "Run all tests")
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
        description: "Do not compile the project before running the tests",
      })
      .addLevel({
        name: "verbosity",
        shortName: "v",
        description: "Verbosity level of the test output",
        defaultValue: DEFAULT_VERBOSITY,
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
  dependencies: () => [import("../solidity/index.js")],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
