import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionEthersPlugin: HardhatPlugin = {
  id: "hardhat-ignition-ethers",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-ignition")).default,
    async () => (await import("@nomicfoundation/hardhat-ethers")).default,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-ethers",
};

export default hardhatIgnitionEthersPlugin;
