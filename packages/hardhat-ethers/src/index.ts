import type { HardhatPlugin } from "hardhat/types/plugins";

export type * from "./type-extensions.js";

const hardhatEthersPlugin: HardhatPlugin = {
  id: "hardhat-ethers",
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers",
};

export default hardhatEthersPlugin;
