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
      const { default: hardhatIgnitionEthersPlugin } = await import(
        "@nomicfoundation/hardhat-ignition-ethers"
      );
      return hardhatIgnitionEthersPlugin;
    },
    async () => {
      const { default: hardhatKeystorePlugin } = await import(
        "@nomicfoundation/hardhat-keystore"
      );
      return hardhatKeystorePlugin;
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
    async () => {
      const { default: HardhatTypechainPlugin } = await import(
        "@nomicfoundation/hardhat-typechain"
      );
      return HardhatTypechainPlugin;
    },
    async () => {
      const { default: HardhatVerifyPlugin } = await import(
        "@nomicfoundation/hardhat-verify"
      );
      return HardhatVerifyPlugin;
    },
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
};

export default hardhatToolboxMochaEthersPlugin;
