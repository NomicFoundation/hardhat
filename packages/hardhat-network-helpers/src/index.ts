import type { HardhatPlugin } from "hardhat/types/plugins";

export type * from "./type-extensions.js";

const hardhatNetworkHelpersPlugin: HardhatPlugin = {
  id: "hardhat-network-helpers",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-network-helpers",
};

export default hardhatNetworkHelpersPlugin;
