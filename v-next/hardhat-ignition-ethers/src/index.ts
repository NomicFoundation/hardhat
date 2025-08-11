import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionEthersPlugin: HardhatPlugin = {
  id: "hardhat-ignition-ethers",
  dependencies: () => [
    import("@nomicfoundation/hardhat-ignition"),
    import("@nomicfoundation/hardhat-ethers"),
  ],
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-ethers",
};

export default hardhatIgnitionEthersPlugin;
