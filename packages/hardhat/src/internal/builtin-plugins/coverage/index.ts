import type { HardhatPlugin } from "../../../types/plugins.js";

import { definePlugin } from "../../../plugins.js";
import { globalFlag, overrideTask } from "../../core/config.js";

export type * from "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = definePlugin({
  id: "builtin:coverage",
  tasks: [
    overrideTask("build")
      .setAction(async () => await import("./tasks/build/task-action.js"))
      .build(),
  ],
  globalOptions: [
    globalFlag({
      name: "coverage",
      description: "Enables code coverage",
    }),
  ],
  hookHandlers: {
    clean: () => import("./hook-handlers/clean.js"),
    config: () => import("./hook-handlers/config.js"),
    hre: () => import("./hook-handlers/hre.js"),
    solidity: () => import("./hook-handlers/solidity.js"),
    test: () => import("./hook-handlers/test.js"),
  },
  dependencies: () => [import("../solidity/index.js")],
  npmPackage: "hardhat",
});

export default hardhatPlugin;
