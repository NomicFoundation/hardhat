import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionEthersPlugin: HardhatPlugin = {
  id: "hardhat-ignition-ethers",
  dependencies: [
    async () => {
      const { default: ignitionPlugin } = await import(
        "@nomicfoundation/hardhat-ignition"
      );

      return ignitionPlugin;
    },
    async () => {
      const { default: ethersPlugin } = await import(
        "@nomicfoundation/hardhat-ethers"
      );

      return ethersPlugin;
    },
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-ethers",
};

export default hardhatIgnitionEthersPlugin;
