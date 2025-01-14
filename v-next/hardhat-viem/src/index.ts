import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-viem",
};

export default hardhatPlugin;
