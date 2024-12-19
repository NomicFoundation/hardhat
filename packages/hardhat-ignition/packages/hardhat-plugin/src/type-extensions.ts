/* eslint-disable import/no-unused-modules */
import "hardhat/types/config";
import "hardhat/types/runtime";

import { DeployConfig, StrategyConfig } from "@nomicfoundation/ignition-core";

declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
  }

  export interface HardhatNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
    };
  }

  export interface HardhatNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
    };
  }

  export interface HttpNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
    };
  }

  export interface HttpNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
    };
  }

  export interface HardhatUserConfig {
    ignition?: Partial<DeployConfig> & {
      strategyConfig?: Partial<StrategyConfig>;
    };
  }

  export interface HardhatConfig {
    ignition: Partial<DeployConfig> & {
      strategyConfig?: Partial<StrategyConfig>;
    };
  }
}
