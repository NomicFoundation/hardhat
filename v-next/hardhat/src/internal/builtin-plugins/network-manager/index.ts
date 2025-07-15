import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalOption } from "../../core/config.js";

import "./type-extensions/config.js";
import "./type-extensions/global-options.js";
import "./type-extensions/hooks.js";
import "./type-extensions/hre.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:network-manager",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
    hre: import.meta.resolve("./hook-handlers/hre.js"),
    network: import.meta.resolve("./hook-handlers/network.js"),
  },
  globalOptions: [
    globalOption({
      name: "network",
      description: "The network to connect to",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      defaultValue: undefined,
    }),
  ],
  npmPackage: "hardhat",
  dependencies: [async () => (await import("../artifacts/index.js")).default],
};

export default hardhatPlugin;
