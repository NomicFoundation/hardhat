import "./type-extensions.js";

import type { HardhatPlugin } from "hardhat/types/plugins";

const hardhatEthersPlugin: HardhatPlugin = {
  id: "hardhat-ethers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers",
};

export default hardhatEthersPlugin;
