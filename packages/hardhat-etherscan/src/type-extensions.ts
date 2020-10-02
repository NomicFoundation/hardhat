import "hardhat/types/config";

import { EtherscanConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatConfig {
    etherscan?: EtherscanConfig;
  }

  interface ResolvedHardhatConfig {
    etherscan: EtherscanConfig;
  }
}
