import "hardhat/types/config";

import { SolppConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    solpp?: Partial<SolppConfig>;
  }

  interface HardhatConfig {
    solpp: SolppConfig;
  }
}
