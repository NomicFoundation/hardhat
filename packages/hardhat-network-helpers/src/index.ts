import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatNetworkHelpersPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-network-helpers",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-network-helpers",
});

export default hardhatNetworkHelpersPlugin;
