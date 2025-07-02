import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-viem",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-ignition")).default,
    async () => (await import("@nomicfoundation/hardhat-viem")).default,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-viem",
};

export default hardhatIgnitionViemPlugin;
