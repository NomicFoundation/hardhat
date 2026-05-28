import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-ignition-viem",
  dependencies: () => [
    import("@nomicfoundation/hardhat-ignition"),
    import("@nomicfoundation/hardhat-viem"),
  ],
  hookHandlers: {
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ignition-viem",
});

export default hardhatIgnitionViemPlugin;
