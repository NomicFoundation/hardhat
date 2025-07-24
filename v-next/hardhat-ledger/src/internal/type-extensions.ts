import "hardhat/types/config";
import type { DerivationFunction } from "./types.js";

declare module "hardhat/types/config" {
  export interface HttpNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
    };
  }

  export interface EdrNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
    };
  }

  export interface HttpNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
    };
  }

  export interface EdrNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: DerivationFunction;
    };
  }
}
