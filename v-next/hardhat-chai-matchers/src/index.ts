import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import "./type-extensions.d.js";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-chai-matchers",
  hookHandlers: {
    mocha: import.meta.resolve("./internal/hook-handlers/mocha.js"),
  },
};

export default hardhatChaiMatchersPlugin;
