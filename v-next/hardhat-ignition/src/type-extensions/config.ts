import "@ignored/hardhat-vnext/types/config";

import type {
  DeployConfig,
  StrategyConfig,
} from "@ignored/hardhat-vnext-ignition-core";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
  }

  export interface EdrNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
      disableFeeBumping?: boolean;
      explorerUrl?: string;
    };
  }

  export interface EdrNetworkConfig {
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
