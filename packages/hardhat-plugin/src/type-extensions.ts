import "hardhat/types/config";
import "hardhat/types/runtime";

import type { IgnitionWrapper } from "./ignition-wrapper";

declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
    deployments?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
    deployments: string;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: IgnitionWrapper;
  }
}
