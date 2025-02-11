import "../../../types/config.js";

declare module "../../../types/config.js" {
  export interface TestPathsUserConfig {
    solidity?: string;
  }

  export interface TestPathsConfig {
    solidity: string;
  }

  export interface SolidityTestUserConfig {
    timeout?: number;
    fsPermissions?: {
      readWrite?: string[];
      read?: string[];
      write?: string[];
    };
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

  export interface HardhatUserConfig {
    solidityTest?: SolidityTestUserConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface -- This could be an extension point
  export interface SolidityTestConfig extends SolidityTestUserConfig {}

  export interface HardhatConfig {
    solidityTest: SolidityTestConfig;
  }
}
