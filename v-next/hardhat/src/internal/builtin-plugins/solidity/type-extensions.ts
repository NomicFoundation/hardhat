import "../../../types/config.js";

declare module "../../../types/config.js" {
  export type SolidityUserConfig =
    | string
    | string[]
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig
    | BuildProfilesSolidityUserConfig;

  export interface SolcUserConfig {
    version: string;
    settings?: any;
  }

  export interface SolidityTestUserConfig {
    timeout?: number;
    fsPermissions?: {
      readWrite?: string[];
      read?: string[];
      write?: string[];
    };
    trace?: boolean;
    testFail?: boolean;
    labels?: Array<{
      address: string; // 0x-prefixed hex string
      label: string;
    }>;
    isolate?: boolean;
    ffi?: boolean;
    sender?: string; // 0x-prefixed hex string
    txOrigin?: string; // 0x-prefixed hex string
    initialBalance?: bigint;
    blockBaseFeePerGas?: bigint;
    blockCoinbase?: string; // 0x-prefixed hex string
    blockTimestamp?: bigint;
    blockDifficulty?: bigint;
    blockGasLimit?: bigint;
    disableBlockGasLimit?: boolean;
    memoryLimit?: bigint;
    ethRpcUrl?: string;
    forkBlockNumber?: bigint;
    rpcEndpoints?: Record<string, string>;
    rpcCachePath?: string;
    rpcStorageCaching?: {
      chains: "All" | "None" | string[];
      endpoints: "All" | "Remote" | RegExp;
    };
    promptTimeout?: number;
    fuzz?: {
      failurePersistDir?: string;
      failurePersistFile?: string;
      runs?: number;
      maxTestRejects?: number;
      seed?: string;
      dictionaryWeight?: number;
      includeStorage?: boolean;
      includePushBytes?: boolean;
    };
    invariant?: {
      failurePersistDir?: string;
      runs?: number;
      depth?: number;
      failOnRevert?: boolean;
      callOverride?: boolean;
      dictionaryWeight?: number;
      includeStorage?: boolean;
      includePushBytes?: boolean;
      shrinkRunLimit?: number;
    };
  }

  export interface SingleVersionSolcUserConfig extends SolcUserConfig {
    test?: SolidityTestUserConfig;
  }

  export interface MultiVersionSolcUserConfig {
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
    test?: SolidityTestUserConfig;
  }

  export interface SingleVersionSolidityUserConfig
    extends SingleVersionSolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface MultiVersionSolidityUserConfig
    extends MultiVersionSolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface BuildProfilesSolidityUserConfig {
    profiles: Record<
      string,
      SingleVersionSolcUserConfig | MultiVersionSolcUserConfig
    >;
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface HardhatUserConfig {
    solidity?: SolidityUserConfig;
  }

  export interface SolcConfig {
    version: string;
    settings: any;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface -- This could be an extension point
  export interface SolidityTestConfig extends SolidityTestUserConfig {}

  export interface SolidityBuildProfileConfig {
    compilers: SolcConfig[];
    overrides: Record<string, SolcConfig>;
    test: SolidityTestConfig;
  }

  export interface SolidityConfig {
    profiles: Record<string, SolidityBuildProfileConfig>;
    dependenciesToCompile: string[];
    remappings: string[];
  }

  export interface HardhatConfig {
    solidity: SolidityConfig;
  }

  export interface SourcePathsUserConfig {
    solidity?: string | string[];
  }

  export interface SourcePathsConfig {
    solidity: string[];
  }
}

import "../../../types/hre.js";
import type { SolidityBuildSystem } from "../../../types/solidity/build-system.js";

declare module "../../../types/hre.js" {
  export interface HardhatRuntimeEnvironment {
    solidity: SolidityBuildSystem;
  }
}

import "../../../types/global-options.js";
declare module "../../../types/global-options.js" {
  export interface GlobalOptions {
    buildProfile: string;
  }
}
