import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface TestPathsUserConfig {
    nodeTest?: string;
  }

  export interface TestPathsConfig {
    nodeTest: string;
  }
}
