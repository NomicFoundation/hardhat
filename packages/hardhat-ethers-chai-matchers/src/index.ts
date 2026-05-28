import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-ethers-chai-matchers",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers-chai-matchers",
  dependencies: () => [import("@nomicfoundation/hardhat-ethers")],
});

export default hardhatChaiMatchersPlugin;
