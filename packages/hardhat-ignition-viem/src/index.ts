import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-viem",
  dependencies: () => [
    import("@nomicfoundation/hardhat-ignition"),
    import("@nomicfoundation/hardhat-viem"),
  ],
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-viem",
};

export default hardhatIgnitionViemPlugin;
