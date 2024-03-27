import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatNetworkUserConfig {
    ledgerOptions: {
      accounts: string[];
      derivationFunction?: (accountNumber: number) => string;
    };
  }
  interface HardhatNetworkConfig {
    ledgerOptions: {
      accounts: string[];
      derivationFunction?: (accountNumber: number) => string;
    };
  }

  interface HttpNetworkUserConfig {
    ledgerOptions: {
      accounts: string[];
      derivationFunction?: (accountNumber: number) => string;
    };
  }
  interface HttpNetworkConfig {
    ledgerOptions: {
      accounts: string[];
      derivationFunction?: (accountNumber: number) => string;
    };
  }
}
