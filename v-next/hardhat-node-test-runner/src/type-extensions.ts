import "@ignored/hardhat-vnext/types/config";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface TestPathsUserConfig {
    nodeTest?: string;
  }

  export interface TestPathsConfig {
    nodeTest: string;
  }
}
