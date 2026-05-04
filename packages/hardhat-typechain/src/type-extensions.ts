import type { TypechainConfig, TypechainUserConfig } from "./types.js";

export type * from "@nomicfoundation/hardhat-ethers";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    typechain?: TypechainUserConfig;
  }

  export interface HardhatConfig {
    readonly typechain: TypechainConfig;
  }
}

declare module "hardhat/types/global-options" {
  interface GlobalOptions {
    noTypechain: boolean;
  }
}
