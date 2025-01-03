import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-chai-matchers",
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
};

export default hardhatChaiMatchersPlugin;
