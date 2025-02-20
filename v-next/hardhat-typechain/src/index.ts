import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";
import { globalOption } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";

const hardhatTypechain: HardhatPlugin = {
  id: "hardhat-typechain",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
    solidity: import.meta.resolve("./internal/hook-handlers/solidity.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-typechain",
  dependencies: [
    async () => {
      const { default: hardhatEthersPlugin } = await import(
        "@nomicfoundation/hardhat-ethers"
      );
      return hardhatEthersPlugin;
    },
  ],
  globalOptions: [
    globalOption({
      name: "noTypechain",
      description: "Disables the typechain type generation",
      defaultValue: false,
      type: ArgumentType.BOOLEAN,
    }),
  ],
};

export default hardhatTypechain;
