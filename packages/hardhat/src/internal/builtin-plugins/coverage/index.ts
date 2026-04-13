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
    clean: async () => await import("./hook-handlers/clean.js"),
    hre: async () => await import("./hook-handlers/hre.js"),
    solidity: async () => await import("./hook-handlers/solidity.js"),
    test: async () => await import("./hook-handlers/test.js"),
  },
  npmPackage: "hardhat",
};

export default hardhatPlugin;
