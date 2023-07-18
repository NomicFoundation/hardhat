/* eslint-disable import/no-unused-modules */
import "hardhat/types/config";
import "hardhat/types/runtime";

import type { IgnitionConfig } from "./index";

import { IgnitionHelper } from "./ignition-helper";

declare module "hardhat/types/config" {
  // TODO: double check each of these makes sense
  export interface ProjectPathsUserConfig {
    ignition?: string;
    deployments?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
    deployments: string;
  }

  export interface HardhatUserConfig {
    ignition?: Partial<IgnitionConfig>;
  }

  export interface HardhatConfig {
    ignition: IgnitionConfig;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: IgnitionHelper;
  }
}
