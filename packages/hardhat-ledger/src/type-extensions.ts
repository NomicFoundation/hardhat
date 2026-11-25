import type { DerivationFunction } from "./internal/types.js";

declare module "hardhat/types/config" {
  export interface HttpNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
      useRemoteLedgerServices?: boolean;
    };
  }

  export interface EdrNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
      useRemoteLedgerServices?: boolean;
    };
  }

  export interface HttpNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
      useRemoteLedgerServices?: boolean;
    };
  }

  export interface EdrNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
      useRemoteLedgerServices?: boolean;
    };
  }
}
