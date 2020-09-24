import "hardhat/types/config";

import { SolppConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatConfig {
    solpp?: Partial<SolppConfig>;
  }
}
