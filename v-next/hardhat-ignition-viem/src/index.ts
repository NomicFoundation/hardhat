import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-viem",
  dependencies: [
    async () => {
      const { default: ignitionPlugin } = await import(
        "@ignored/hardhat-vnext-ignition"
      );

      return ignitionPlugin;
    },
    async () => {
      const { default: viemPlugin } = await import(
        "@ignored/hardhat-vnext-viem"
      );

      return viemPlugin;
    },
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ignition-viem",
};

export default hardhatIgnitionViemPlugin;
