import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxMochaEthersPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-mocha-ethers",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-ethers")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-ethers-chai-matchers")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-ignition-ethers")).default,
    async () => (await import("@nomicfoundation/hardhat-keystore")).default,
    async () => (await import("@nomicfoundation/hardhat-mocha")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-network-helpers")).default,
    async () => (await import("@nomicfoundation/hardhat-typechain")).default,
    async () => (await import("@nomicfoundation/hardhat-verify")).default,
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
};

export default hardhatToolboxMochaEthersPlugin;
