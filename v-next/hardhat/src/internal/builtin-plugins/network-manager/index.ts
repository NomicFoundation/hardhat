import type { HardhatPlugin } from "../../../types/plugins.js";

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
      defaultValue: "",
    }),
  ],
  npmPackage: "hardhat",
  dependencies: [
    async () => {
      const { default: artifactsPlugin } = await import(
        "../artifacts/index.js"
      );
      return artifactsPlugin;
    },
  ],
};

export default hardhatPlugin;
