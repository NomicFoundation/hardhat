import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatEthersPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-ethers",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers",
});

export default hardhatEthersPlugin;
