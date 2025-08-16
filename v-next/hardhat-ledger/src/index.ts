import type { HardhatPlugin } from "hardhat/types/plugins";

const hardhatLedgerPlugin: HardhatPlugin = {
  id: "@nomicfoundation/hardhat-ledger",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    network: () => import("./internal/hook-handlers/network.js"),
  },
};

export default hardhatLedgerPlugin;

export * from "./types.js";
export * from "./type-extensions.js";