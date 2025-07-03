import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-ethers-chai-matchers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ethers-chai-matchers",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-ethers")).default,
  ],
};

export default hardhatChaiMatchersPlugin;
