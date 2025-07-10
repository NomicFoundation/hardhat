import type { HardhatPlugin } from "hardhat/types/plugins";

import "./internal/type-extensions.js";

import { emptyTask } from "hardhat/config";

const hardhatLedgerPlugin: HardhatPlugin = {
  id: "hardhat-ledger",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
  },
  tasks: [emptyTask("ledger", "Interact with Ledger hardware wallets").build()],
  npmPackage: "@nomicfoundation/hardhat-ledger",
};

export default hardhatLedgerPlugin;
