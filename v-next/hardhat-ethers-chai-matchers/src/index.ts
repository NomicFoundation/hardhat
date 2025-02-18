import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-ethers-chai-matchers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-ethers-chai-matchers",
  dependencies: [
    async () => {
      const { default: hardhatEthersPlugin } = await import(
        "@ignored/hardhat-vnext-ethers"
      );
      return hardhatEthersPlugin;
    },
  ],
};

export default hardhatChaiMatchersPlugin;
