import type { HardhatPlugin } from "hardhat/types/plugins";

import "./internal/type-extensions.js";

import { emptyTask } from "hardhat/config";

import { PLUGIN_NAME } from "./internal/plugin-name.js";

const hardhatLedgerPlugin: HardhatPlugin = {
  id: PLUGIN_NAME,
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
  tasks: [emptyTask("ledger", "Interact with Ledger hardware wallets").build()],
  npmPackage: "@nomicfoundation/hardhat-ledger",
};

export default hardhatLedgerPlugin;
