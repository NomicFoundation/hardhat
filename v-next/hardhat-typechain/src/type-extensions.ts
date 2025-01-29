import "@ignored/hardhat-vnext/types/config";
import type { TypechainConfig, TypechainUserConfig } from "./types.js";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface HardhatUserConfig {
    typechain?: TypechainUserConfig;
  }

  export interface HardhatConfig {
    readonly typechain: TypechainConfig;
  }
}

import "@ignored/hardhat-vnext/types/global-options";
declare module "@ignored/hardhat-vnext/types/global-options" {
  interface GlobalOptions {
    noTypechain: boolean;
  }
}
