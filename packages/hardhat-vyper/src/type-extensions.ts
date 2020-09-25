import "hardhat/types";

import { VyperConfig } from "./types";

declare module "hardhat/types" {
  interface HardhatConfig {
    vyper?: Partial<VyperConfig>;
  }
}
