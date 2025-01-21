import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatTypechain: HardhatPlugin = {
  id: "hardhat-typechain",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
    solidity: import.meta.resolve("./internal/hook-handlers/solidity.js"),
  },
  npmPackage: "@ignored/hardhat-vnext-typechain",
  dependencies: [
    async () => {
      const { default: hardhatEthersPlugin } = await import(
        "@ignored/hardhat-vnext-ethers"
      );
      return hardhatEthersPlugin;
    },
  ],
};

export default hardhatTypechain;
