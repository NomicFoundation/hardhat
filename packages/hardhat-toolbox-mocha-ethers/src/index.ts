import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatToolboxMochaEthersPlugin: HardhatPlugin = {
  id: "hardhat-toolbox-mocha-ethers",
  dependencies: () => [
    import("@nomicfoundation/hardhat-ethers"),
    import("@nomicfoundation/hardhat-ethers-chai-matchers"),
    import("@nomicfoundation/hardhat-ignition-ethers"),
    import("@nomicfoundation/hardhat-keystore"),
    import("@nomicfoundation/hardhat-mocha"),
    import("@nomicfoundation/hardhat-network-helpers"),
    import("@nomicfoundation/hardhat-typechain"),
    import("@nomicfoundation/hardhat-verify"),
  ],
  npmPackage: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
};

export default hardhatToolboxMochaEthersPlugin;
