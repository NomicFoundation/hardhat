import type { HardhatPlugin } from "../../../types/plugins.js";

import { definePlugin } from "../../../plugins.js";
import { ArgumentType } from "../../../types/arguments.js";
import { overrideTask } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = definePlugin({
  id: "builtin:watch",
  tasks: [
    overrideTask("build")
      .addFlag({
        name: "watch",
        shortName: "w",
        description:
          "Build again each time a source file, a Solidity test or the config changes",
      })
      .addOption({
        name: "watchDelay",
        description:
          "With --watch, how long to wait for more changes before building, in milliseconds",
        type: ArgumentType.INT,
        defaultValue: 50,
      })
      .addFlag({
        name: "noRestart",
        description:
          "With --watch, ignore changes while a build is in progress instead of restarting it",
      })
      .setAction(async () => await import("./task-overrides/build.js"))
      .build(),
    overrideTask("test")
      .addFlag({
        name: "watch",
        shortName: "w",
        description:
          "Run the tests again each time a source file, a test or the config changes",
      })
      .addOption({
        name: "watchDelay",
        description:
          "With --watch, how long to wait for more changes before running, in milliseconds",
        type: ArgumentType.INT,
        defaultValue: 50,
      })
      .addFlag({
        name: "noRestart",
        description:
          "With --watch, ignore changes while the tests are running instead of restarting them",
      })
      .addFlag({
        name: "runAll",
        description:
          "With --watch, run every test on each change instead of only the test file that changed",
      })
      .setAction(async () => await import("./task-overrides/test.js"))
      .build(),
    overrideTask(["test", "solidity"])
      .addFlag({
        name: "watch",
        shortName: "w",
        description:
          "Run the Solidity tests again each time a source file, a Solidity test or the config changes",
      })
      .addOption({
        name: "watchDelay",
        description:
          "With --watch, how long to wait for more changes before running, in milliseconds",
        type: ArgumentType.INT,
        defaultValue: 50,
      })
      .addFlag({
        name: "noRestart",
        description:
          "With --watch, ignore changes while the tests are running instead of restarting them",
      })
      .addFlag({
        name: "runAll",
        description:
          "With --watch, run every test on each change instead of only the test file that changed",
      })
      .setAction(async () => await import("./task-overrides/test-solidity.js"))
      .build(),
  ],
  dependencies: () => [
    import("../solidity/index.js"),
    import("../test/index.js"),
    import("../solidity-test/index.js"),
  ],
  npmPackage: "hardhat",
});

export default hardhatPlugin;
