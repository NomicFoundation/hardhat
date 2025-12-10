import type { HardhatPlugin } from "../../../types/plugins.js";

import { globalFlag, overrideTask } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:gas-analytics",
  tasks: [
    overrideTask("test")
      .setAction(async () => ({
        default: async (args, _hre, runSuper) => {
          await runSuper(args);
        },
      }))
      .addFlag({
        name: "snapshot",
        description: "Update gas snapshots (Solidity tests only)",
      })
      .build(),
    overrideTask(["test", "solidity"])
      .setAction(async () => ({
        default: async (args, _hre, runSuper) => {
          await runSuper(args);
        },
      }))
      .addFlag({
        name: "snapshot",
        description: "Update gas snapshots",
      })
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
