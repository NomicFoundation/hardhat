import "hardhat/types/config";

import { VyperUserConfig, MultiVyperConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    vyper?: VyperUserConfig;
  }

  interface HardhatConfig {
    vyper: MultiVyperConfig;
  }
}
