import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }
  interface HardhatNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }

  interface HttpNetworkUserConfig {
    ledgerAccounts?: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }
  interface HttpNetworkConfig {
    ledgerAccounts: string[];
    ledgerOptions?: {
      derivationFunction?: (accountNumber: number) => string;
    };
  }
}
