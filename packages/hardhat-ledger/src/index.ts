import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

import { PLUGIN_NAME } from "./internal/plugin-name.js";

const hardhatLedgerPlugin: HardhatPlugin = {
  id: PLUGIN_NAME,
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    network: () => import("./internal/hook-handlers/network.js"),
  },
  npmPackage: "@nomicfoundation/hardhat-ledger",
};

export default hardhatLedgerPlugin;
