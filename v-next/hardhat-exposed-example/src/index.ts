import type { HardhatPlugin } from "hardhat/types/plugins";

const plugin: HardhatPlugin = {
  id: "hardhat-exposed-example",
  hookHandlers: {
    solidity: () => import("./internal/hook-handlers/solidity.js"),
    config: () => import("./internal/hook-handlers/config.js"),
    clean: () => import("./internal/hook-handlers/clean.js"),
  },
};

export default plugin;
