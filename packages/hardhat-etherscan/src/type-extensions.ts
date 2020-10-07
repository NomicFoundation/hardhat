import "hardhat/types/config";

import { EtherscanConfig } from "./types";

declare module "hardhat/types/config" {
  interface UserHardhatConfig {
    etherscan?: EtherscanConfig;
  }

  interface HardhatConfig {
    etherscan: EtherscanConfig;
  }
}
