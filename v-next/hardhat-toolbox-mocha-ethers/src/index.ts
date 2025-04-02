import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxMochaEthersPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-mocha-ethers",
  dependencies: [
    async () => {
      const { default: hardhatEthersPlugin } = await import(
        "@nomicfoundation/hardhat-ethers"
      );
      return hardhatEthersPlugin;
    },
    async () => {
      const { default: hardhatEthersChaiMatchersPlugin } = await import(
        "@nomicfoundation/hardhat-ethers-chai-matchers"
      );
      return hardhatEthersChaiMatchersPlugin;
    },
    async () => {
      const { default: hardhatIgnitionPlugin } = await import(
        "@nomicfoundation/hardhat-ignition"
      );
      return hardhatIgnitionPlugin;
    },
    async () => {
      const { default: hardhatMochaPlugin } = await import(
        "@nomicfoundation/hardhat-mocha"
      );
      return hardhatMochaPlugin;
    },
    async () => {
      const { default: hardhatNetworkHelpersPlugin } = await import(
        "@nomicfoundation/hardhat-network-helpers"
      );
      return hardhatNetworkHelpersPlugin;
    },
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
};

export default hardhatToolboxMochaEthersPlugin;
