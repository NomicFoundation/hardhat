import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";
import { globalOption } from "@ignored/hardhat-vnext/config";
import { ArgumentType } from "@ignored/hardhat-vnext/types/arguments";

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
