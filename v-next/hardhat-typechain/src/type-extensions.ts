import "hardhat/types/config";
import type { TypechainConfig, TypechainUserConfig } from "./types.js";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    typechain?: TypechainUserConfig;
  }

  export interface HardhatConfig {
    readonly typechain: TypechainConfig;
  }
}

import "hardhat/types/global-options";
declare module "hardhat/types/global-options" {
  interface GlobalOptions {
    noTypechain: boolean;
  }
}
