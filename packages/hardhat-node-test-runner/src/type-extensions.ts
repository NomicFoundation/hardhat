import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface TestPathsUserConfig {
    nodejs?: string;
  }

  export interface TestPathsConfig {
    nodejs: string;
  }
}
