import type { HardhatPlugin } from "../../../types/plugins.js";

import { globalFlag } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:gas-analytics",
  tasks: [],
  globalOptions: [
    globalFlag({
      name: "gasStats",
      description:
        "Collects and displays gas usage statistics for all function calls during tests",
    }),
  ],
  hookHandlers: {},
  npmPackage: "hardhat",
};

export default hardhatPlugin;
