import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity-tests",
  tasks: [
    task(["test", "solidity"], "Run the Solidity tests")
      .setAction(import.meta.resolve("./task-action.js"))
      .addOption({
        name: "timeout",
        description:
          "The maximum time in milliseconds to wait for all the test suites to finish",
        type: ArgumentType.INT,
        defaultValue: 60 * 60 * 1000,
      })
      .addFlag({
        name: "noCompile",
        description: "Don't compile the project before running the tests",
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
