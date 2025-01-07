import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
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
      .addOption({
        name: "timeout",
        description:
          "The maximum time in milliseconds to wait for all the test suites to finish",
        type: ArgumentType.INT,
        defaultValue: 60 * 60 * 1000,
      })
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
};

export default hardhatPlugin;
