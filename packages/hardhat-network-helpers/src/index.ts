import "./type-extensions.js";

import type { HardhatPlugin } from "hardhat/types/plugins";

const hardhatNetworkHelpersPlugin: HardhatPlugin = {
  id: "hardhat-network-helpers",
  hookHandlers: {
    network: async () => await import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-network-helpers",
};

export default hardhatNetworkHelpersPlugin;
