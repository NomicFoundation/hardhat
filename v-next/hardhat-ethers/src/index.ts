import "./type-extensions.js";

import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

const hardhatEthersPlugin: HardhatPlugin = {
  id: "hardhat-ethers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ethers",
};

export default hardhatEthersPlugin;
