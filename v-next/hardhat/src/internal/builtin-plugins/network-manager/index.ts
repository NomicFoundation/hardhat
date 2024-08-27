import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { globalOption } from "@ignored/hardhat-vnext-core/config";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "network-manager",
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
};

export default hardhatPlugin;
