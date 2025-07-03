import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";
import { globalFlag } from "hardhat/config";

const hardhatTypechain: HardhatPlugin = {
  id: "hardhat-typechain",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
    solidity: import.meta.resolve("./internal/hook-handlers/solidity.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-typechain",
  dependencies: [
    async () => (await import("@nomicfoundation/hardhat-ethers")).default,
  ],
  globalOptions: [
    globalFlag({
      name: "noTypechain",
      description: "Disables the typechain type generation",
    }),
  ],
};

export default hardhatTypechain;
