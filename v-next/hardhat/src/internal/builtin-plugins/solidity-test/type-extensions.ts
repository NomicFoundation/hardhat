import "@ignored/hardhat-vnext/types/config";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface TestPathsUserConfig {
    solidity?: string | string[];
  }

  export interface TestPathsConfig {
    solidity: string[];
  }
}
