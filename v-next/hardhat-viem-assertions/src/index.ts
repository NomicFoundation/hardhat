import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem-assertions",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-viem")).default,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-viem-assertions",
};

export default hardhatPlugin;
