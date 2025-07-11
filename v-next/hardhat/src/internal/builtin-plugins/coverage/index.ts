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
    clean: import.meta.resolve("./hook-handlers/clean.js"),
    hre: import.meta.resolve("./hook-handlers/hre.js"),
    solidity: import.meta.resolve("./hook-handlers/solidity.js"),
  },
  npmPackage: "hardhat",
};

export default hardhatPlugin;
