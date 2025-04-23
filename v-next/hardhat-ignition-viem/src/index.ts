import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-viem",
  dependencies: [
    async () => {
      const { default: ignitionPlugin } = await import(
        "@nomicfoundation/hardhat-ignition"
      );

      return ignitionPlugin;
    },
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
  npmPackage: "@nomicfoundation/hardhat-ignition-viem",
};

export default hardhatIgnitionViemPlugin;
