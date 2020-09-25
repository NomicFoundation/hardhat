import "hardhat/types";

import { SolppConfig } from "./types";

declare module "hardhat/types" {
  interface HardhatConfig {
    solpp?: Partial<SolppConfig>;
  }
}
