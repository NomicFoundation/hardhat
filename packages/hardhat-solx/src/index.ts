import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatSolxPlugin: HardhatPlugin = {
  id: "hardhat-solx",
  npmPackage: "@nomicfoundation/hardhat-solx",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    solidity: () => import("./internal/hook-handlers/solidity.js"),
  },
};

export default hardhatSolxPlugin;
