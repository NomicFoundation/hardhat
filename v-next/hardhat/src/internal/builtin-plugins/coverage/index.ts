import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalOption } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:coverage",
  tasks: [],
  globalOptions: [
    globalOption({
      name: "coverage",
      description: "Enables code coverage",
      type: ArgumentType.BOOLEAN,
      defaultValue: false,
    }),
  ],
  hookHandlers: {
    clean: import.meta.resolve("./hook-handlers/clean.js"),
    hre: import.meta.resolve("./hook-handlers/hre.js"),
    solidity: import.meta.resolve("./hook-handlers/solidity.js"),
  },
  npmPackage: "hardhat",
};

export default hardhatPlugin;
