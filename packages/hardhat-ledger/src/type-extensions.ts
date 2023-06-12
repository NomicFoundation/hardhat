import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatNetworkUserConfig {
    ledgerAccounts?: string[];
  }
}
