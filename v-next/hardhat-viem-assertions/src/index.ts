import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem-assertions",
  dependencies: [
    async () => {
      const { default: viemPlugin } = await import(
        "@nomicfoundation/hardhat-viem"
      );

      return viemPlugin;
    },
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-viem-assertions",
};

export default hardhatPlugin;
