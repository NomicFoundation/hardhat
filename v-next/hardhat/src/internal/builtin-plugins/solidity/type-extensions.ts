import "../../../types/config.js";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface SourcePathsUserConfig {
    solidity?: string | string[];
  }

  export interface SourcePathsConfig {
    solidity: string | string[];
  }
}
