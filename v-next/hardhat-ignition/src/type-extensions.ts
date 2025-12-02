import "hardhat/types/config";

import type {
  DeployConfig,
  StrategyConfig,
} from "@nomicfoundation/ignition-core";

declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
  }

  export interface EdrNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
      maxRetries?: number;
      retryInterval?: number;
    };
  }

  export interface EdrNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
      maxRetries?: number;
      retryInterval?: number;
    };
  }

  export interface HttpNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
      maxRetries?: number;
      retryInterval?: number;
    };
  }

  export interface HttpNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
      maxRetries?: number;
      retryInterval?: number;
    };
  }

  export type IgnitionUserConfig = Partial<DeployConfig> & {
    strategyConfig?: Partial<StrategyConfig>;
  };

  export interface HardhatUserConfig {
    ignition?: IgnitionUserConfig;
  }

  export type IgnitionConfig = Partial<DeployConfig> & {
    strategyConfig?: Partial<StrategyConfig>;
  };

  export interface HardhatConfig {
    ignition: IgnitionConfig;
  }
}
