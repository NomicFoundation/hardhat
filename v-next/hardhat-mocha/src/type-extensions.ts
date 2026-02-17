import "hardhat/types/config";

import type {
  ChainType,
  DefaultChainType,
  NetworkConnectionParams,
  NetworkConnection,
} from "hardhat/types/network";
import type { MochaOptions } from "mocha";

declare module "hardhat/types/config" {
  export interface TestPathsUserConfig {
    mocha?: string;
  }

  export interface TestPathsConfig {
    mocha: string;
  }
}

import "hardhat/types/test";
declare module "hardhat/types/test" {
  export interface HardhatTestUserConfig {
    mocha?: MochaOptions;
  }

  export interface HardhatTestConfig {
    mocha: MochaOptions;
  }
}

import "hardhat/types/network";
declare module "hardhat/types/network" {
  export interface NetworkManager<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    mocha: MochaNetworkHelpers<ChainTypeT>;
  }
}

export interface MochaNetworkHelpers<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  connectOnBefore(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    closeOnAfter?: boolean,
  ): NetworkConnection<ChainTypeT>;
}
