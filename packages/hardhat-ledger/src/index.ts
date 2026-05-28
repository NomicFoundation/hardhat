import type { HardhatPlugin } from "hardhat/types/plugins";

export type * from "./type-extensions.js";

import { definePlugin } from "hardhat/plugins";

import { PLUGIN_NAME } from "./internal/plugin-name.js";

const hardhatLedgerPlugin: HardhatPlugin = definePlugin({
  id: PLUGIN_NAME,
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ledger",
});

export default hardhatLedgerPlugin;
