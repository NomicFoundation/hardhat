import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem-matchers",
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
  npmPackage: "@nomicfoundation/hardhat-viem-matchers",
};

export default hardhatPlugin;
