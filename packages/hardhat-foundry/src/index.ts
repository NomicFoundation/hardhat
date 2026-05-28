import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

const hardhatFoundry: HardhatPlugin = definePlugin({
  id: "@nomicfoundation/hardhat-foundry",
  hookHandlers: {
    solidity: () => import("./internal/hook-handlers/solidity.js"),
  },
});

export default hardhatFoundry;
