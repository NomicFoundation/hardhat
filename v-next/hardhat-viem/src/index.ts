import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-viem",
};

export default hardhatPlugin;
