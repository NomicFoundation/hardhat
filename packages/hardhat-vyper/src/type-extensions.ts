import "hardhat/types/config";

import { VyperConfig } from "./types";

declare module "hardhat/types/config" {
  interface UserHardhatConfig {
    vyper?: Partial<VyperConfig>;
  }

  interface HardhatConfig {
    vyper: VyperConfig;
  }
}
