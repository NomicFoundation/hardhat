import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem",
  hookHandlers: {
    network: import.meta.resolve("./hook-handlers/network.js"),
  },
};

export default hardhatPlugin;
