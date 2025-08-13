import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-ethers-chai-matchers",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers-chai-matchers",
  dependencies: () => [import("@nomicfoundation/hardhat-ethers")],
};

export default hardhatChaiMatchersPlugin;
