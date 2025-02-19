import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionEthersPlugin: HardhatPlugin = {
  id: "hardhat-ignition-ethers",
  dependencies: [
    async () => {
      const { default: ignitionPlugin } = await import(
        "@ignored/hardhat-vnext-ignition"
      );

      return ignitionPlugin;
    },
    async () => {
      const { default: ethersPlugin } = await import(
        "@ignored/hardhat-vnext-ethers"
      );

      return ethersPlugin;
    },
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ignition-ethers",
};

export default hardhatIgnitionEthersPlugin;
