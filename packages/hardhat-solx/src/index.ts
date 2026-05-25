import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatSolxPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-solx",
  npmPackage: "@nomicfoundation/hardhat-solx",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    solidity: () => import("./internal/hook-handlers/solidity.js"),
  },
});

export default hardhatSolxPlugin;
