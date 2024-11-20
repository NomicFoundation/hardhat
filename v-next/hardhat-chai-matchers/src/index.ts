import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

const hardhatChaiMatchersPlugin: HardhatPlugin = {
  id: "hardhat-chai-matchers",
  hookHandlers: {
    mocha: import.meta.resolve("./internal/hook-handlers/mocha.js"),
  },
};

export default hardhatChaiMatchersPlugin;
