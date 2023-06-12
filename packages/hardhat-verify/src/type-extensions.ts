import "hardhat/types/config";

import { EtherscanConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    etherscan?: Partial<EtherscanConfig>;
  }

  interface HardhatConfig {
    etherscan: EtherscanConfig;
  }
}
