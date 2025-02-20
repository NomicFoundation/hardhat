import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-viem",
};

export default hardhatPlugin;
