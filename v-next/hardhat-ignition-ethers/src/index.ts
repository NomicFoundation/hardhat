import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import hardhatEthersPlugin from "@ignored/hardhat-vnext-ethers";
import hardhatIgnitionPlugin from "@ignored/hardhat-vnext-ignition";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: "hardhat-ignition-ethers",
  dependencies: [
    async () => hardhatIgnitionPlugin,
    async () => hardhatEthersPlugin,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ignition-ethers",
};

export default hardhatIgnitionViemPlugin;
