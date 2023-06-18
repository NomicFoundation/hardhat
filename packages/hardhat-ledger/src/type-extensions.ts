import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatNetworkUserConfig {
    ledgerAccounts?: string[];
  }
  interface HardhatNetworkConfig {
    ledgerAccounts: string[];
  }

  interface HttpNetworkUserConfig {
    ledgerAccounts?: string[];
  }
  interface HttpNetworkConfig {
    ledgerAccounts: string[];
  }
}
