import type { HardhatPlugin } from "../../../types/plugins.js";

import { globalFlag, overrideTask } from "../../core/config.js";

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
          await runSuper(args);
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
      .setAction(async () => import("./tasks/solidity-test/task-action.js"))
      .build(),
  ],
  globalOptions: [
    globalFlag({
      name: "gasStats",
      description:
        "Collects and displays gas usage statistics for all function calls during tests",
    }),
  ],
  hookHandlers: {
    hre: () => import("./hook-handlers/hre.js"),
  },
  dependencies: () => [
    import("../test/index.js"),
    import("../solidity-test/index.js"),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
