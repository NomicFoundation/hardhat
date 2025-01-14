import "./type-extensions.js";

import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

const hardhatNetworkHelpersPlugin: HardhatPlugin = {
  id: "hardhat-network-helpers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-network-helpers",
};

export default hardhatNetworkHelpersPlugin;
