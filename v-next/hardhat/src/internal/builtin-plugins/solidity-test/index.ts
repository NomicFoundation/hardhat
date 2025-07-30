import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "hardhat/types/arguments";

import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity-tests",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
    test: import.meta.resolve("./hook-handlers/test.js"),
  },
  tasks: [
    task(["test", "solidity"], "Run the Solidity tests")
      .addVariadicArgument({
        name: "testFiles",
        description: "An optional list of files to test",
        defaultValue: [],
      })
      .addOption({
        name: "chainType",
        description: "The chain type to use",
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
      .addLevel({
        name: "verbosity",
        shortName: "v",
        description: "Verbosity level of the test output",
        defaultValue: 2,
      })
      .addFlag({
        name: "gasReport",
        description: "Print a gas report",
      })
      .addFlag({
        name: "gasReportSnapshot",
        description:
          "Saves the gas report to disk (requires --gas-report to be enabled)",
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  dependencies: [
    async () => (await import("../solidity/index.js")).default,
    async () => (await import("../test/index.js")).default,
    async () => (await import("../coverage/index.js")).default,
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
