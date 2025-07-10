import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface HttpNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }

  export interface EdrNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }

  export interface HttpNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }

  export interface EdrNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }
}
