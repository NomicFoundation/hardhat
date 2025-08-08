import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxViemPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-viem",
  dependencies: () => [
    import("@nomicfoundation/hardhat-ignition-viem"),
    import("@nomicfoundation/hardhat-keystore"),
    import("@nomicfoundation/hardhat-network-helpers"),
    import("@nomicfoundation/hardhat-node-test-runner"),
    import("@nomicfoundation/hardhat-viem"),
    import("@nomicfoundation/hardhat-viem-assertions"),
    import("@nomicfoundation/hardhat-verify"),
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-viem",
};

export default hardhatToolboxViemPlugin;
