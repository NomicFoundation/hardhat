import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalFlag, globalOption, overrideTask } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:gas-analytics",
  tasks: [
    overrideTask("test")
      .addFlag({
        name: "snapshot",
        description: "Update snapshots (Solidity tests only)",
      })
      .addFlag({
        name: "snapshotCheck",
        description:
          "Check the snapshots match the stored values (Solidity tests only)",
      })
      .setAction(async () => ({
        default: async (args, _hre, runSuper) => {
          // We don't need to do anything here, as the test task will forward
          // the arguments to its subtasks.
          return await runSuper(args);
        },
      }))
      .build(),
    overrideTask(["test", "solidity"])
      .addFlag({
        name: "snapshot",
        description: "Update snapshots",
      })
      .addFlag({
        name: "snapshotCheck",
        description: "Check the snapshots match the stored values",
      })
      .setAction(
        async () => await import("./tasks/solidity-test/task-action.js"),
      )
      .build(),
  ],
  globalOptions: [
    globalFlag({
      name: "gasStats",
      description:
        "Collects and displays gas usage statistics for all function calls during tests",
    }),
    globalOption({
      name: "gasStatsJson",
      description:
        "Write gas usage statistics to a JSON file at the specified path",
      type: ArgumentType.FILE_WITHOUT_DEFAULT,
      defaultValue: undefined,
    }),
  ],
  hookHandlers: {
    hre: () => import("./hook-handlers/hre.js"),
    test: () => import("./hook-handlers/test.js"),
  },
  dependencies: () => [
    import("../test/index.js"),
    import("../solidity-test/index.js"),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
