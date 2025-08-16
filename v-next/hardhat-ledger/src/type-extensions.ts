import type { LedgerConnection, LedgerOptions } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection {
    ledger?: LedgerConnection;
  }
}

declare module "hardhat/types/config" {
  interface NetworkConfig {
    ledgerAccounts?: string[] | number[];
    ledgerOptions?: LedgerOptions;
  }

  interface NetworkUserConfig {
    ledgerAccounts?: string[] | number[];
    ledgerOptions?: LedgerOptions;
  }
}