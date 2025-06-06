import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxViemPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-viem",
  dependencies: [
    async () => {
      const { default: hardhatIgnitionViemPlugin } = await import(
        "@nomicfoundation/hardhat-ignition-viem"
      );
      return hardhatIgnitionViemPlugin;
    },
    async () => {
      const { default: hardhatKeystorePlugin } = await import(
        "@nomicfoundation/hardhat-keystore"
      );
      return hardhatKeystorePlugin;
    },
    async () => {
      const { default: hardhatNetworkHelpersPlugin } = await import(
        "@nomicfoundation/hardhat-network-helpers"
      );
      return hardhatNetworkHelpersPlugin;
    },
    async () => {
      const { default: hardhatNodeTestRunnerPlugin } = await import(
        "@nomicfoundation/hardhat-node-test-runner"
      );
      return hardhatNodeTestRunnerPlugin;
    },
    async () => {
      const { default: hardhatViemPlugin } = await import(
        "@nomicfoundation/hardhat-viem"
      );
      return hardhatViemPlugin;
    },
    async () => {
      const { default: hardhatViemAssertions } = await import(
        "@nomicfoundation/hardhat-viem-assertions"
      );
      return hardhatViemAssertions;
    },
    async () => {
      const { default: HardhatVerifyPlugin } = await import(
        "@nomicfoundation/hardhat-verify"
      );
      return HardhatVerifyPlugin;
    },
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-viem",
};

export default hardhatToolboxViemPlugin;
