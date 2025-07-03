import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxViemPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-viem",
  dependencies: [
    async () =>
      (await import("@nomicfoundation/hardhat-ignition-viem")).default,
    async () => (await import("@nomicfoundation/hardhat-keystore")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-network-helpers")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-node-test-runner")).default,
    async () => (await import("@nomicfoundation/hardhat-viem")).default,
    async () =>
      (await import("@nomicfoundation/hardhat-viem-assertions")).default,
    async () => (await import("@nomicfoundation/hardhat-verify")).default,
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-viem",
};

export default hardhatToolboxViemPlugin;
