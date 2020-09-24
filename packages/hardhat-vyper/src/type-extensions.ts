import "hardhat/types/config";

import { VyperConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatConfig {
    vyper?: Partial<VyperConfig>;
  }
}
