import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import hardhatIgnitionPlugin from "@ignored/hardhat-vnext-ignition";
import hardhatViemPlugin from "@ignored/hardhat-vnext-viem";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-viem",
  dependencies: [
    async () => hardhatIgnitionPlugin,
    async () => hardhatViemPlugin,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ignition-viem",
};

export default hardhatIgnitionViemPlugin;
