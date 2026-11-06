import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

export type * from "./type-extensions.js";

const hardhatSlangPlugin: HardhatPlugin = definePlugin({
  id: "hardhat-slang",
  npmPackage: "@nomicfoundation/hardhat-slang",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    solidity: () => import("./internal/hook-handlers/solidity.js"),
  },
});

export default hardhatSlangPlugin;
