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
    isolate?: boolean;
    ffi?: boolean;

    from?: string; // 0x-prefixed hex string
    txOrigin?: string; // 0x-prefixed hex string
    initialBalance?: bigint;
    blockBaseFeePerGas?: bigint;
    coinbase?: string; // 0x-prefixed hex string
    blockTimestamp?: bigint;
    prevRandao?: bigint;
    blockGasLimit?: bigint | false;

    forking?: {
      url?: string;
      blockNumber?: bigint;
      rpcEndpoints?: Record<string, string>;
    };

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
