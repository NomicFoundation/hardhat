import "hardhat/types/config";

import { SolppConfig } from "./types";

declare module "hardhat/types/config" {
  interface UserHardhatConfig {
    solpp?: Partial<SolppConfig>;
  }
}
