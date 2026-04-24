import type { MochaOptions } from "mocha";

declare module "hardhat/types/config" {
  export interface TestPathsUserConfig {
    mocha?: string;
  }

  export interface TestPathsConfig {
    mocha: string;
  }
}

declare module "hardhat/types/test" {
  export interface HardhatTestUserConfig {
    mocha?: MochaOptions;
  }

  export interface HardhatTestConfig {
    mocha: MochaOptions;
  }
}
