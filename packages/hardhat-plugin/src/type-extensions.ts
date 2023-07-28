/* eslint-disable import/no-unused-modules */
import "hardhat/types/config";
import "hardhat/types/runtime";

import { DeployConfig } from "@ignored/ignition-core";

import { IgnitionHelper } from "./ignition-helper";

declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
  }

  export interface HardhatUserConfig {
    ignition?: Partial<DeployConfig>;
  }

  export interface HardhatConfig {
    ignition: Partial<DeployConfig>;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: IgnitionHelper;
  }
}
