import "hardhat/types/config";

import { EtherscanConfig, EtherscanUserConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    etherscan?: EtherscanUserConfig;
  }

  interface HardhatConfig {
    etherscan: EtherscanConfig;
  }
}
