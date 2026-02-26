import type { HardhatPlugin } from "../../../types/plugins.js";

import { globalFlag } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:coverage",
  tasks: [],
  globalOptions: [
    globalFlag({
      name: "coverage",
      description: "Enables code coverage",
    }),
  ],
  hookHandlers: {
    clean: () => import("./hook-handlers/clean.js"),
    hre: () => import("./hook-handlers/hre.js"),
    solidity: () => import("./hook-handlers/solidity.js"),
    test: () => import("./hook-handlers/test.js"),
  },
  npmPackage: "hardhat",
};

export default hardhatPlugin;
