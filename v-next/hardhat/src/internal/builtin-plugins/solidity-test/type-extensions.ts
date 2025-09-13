import "../../../types/config.js";
import type {
  SensitiveString,
  ResolvedConfigurationVariable,
} from "../../../types/config.js";

declare module "../../../types/config.js" {
  export interface TestPathsUserConfig {
    solidity?: string;
  }

  export interface TestPathsConfig {
    solidity: string;
  }
}

declare module "../../../types/test.js" {
  export interface SolidityTestUserConfig {
    timeout?: number;
    fsPermissions?: {
      readWriteFile?: string[];
      readFile?: string[];
      writeFile?: string[];
      dangerouslyReadWriteDirectory?: string[];
      readDirectory?: string[];
      dangerouslyWriteDirectory?: string[];
    };
    isolate?: boolean;
    ffi?: boolean;
    allowInternalExpectRevert?: boolean;
    from?: string; // 0x-prefixed hex string
    txOrigin?: string; // 0x-prefixed hex string
    initialBalance?: bigint;
    blockBaseFeePerGas?: bigint;
    coinbase?: string; // 0x-prefixed hex string
    blockTimestamp?: bigint;
    prevRandao?: bigint;
    blockGasLimit?: bigint | false;

    forking?: {
      url?: SensitiveString;
      blockNumber?: bigint;
      rpcEndpoints?: Record<string, SensitiveString>;
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

  export interface HardhatTestUserConfig {
    solidity?: SolidityTestUserConfig;
  }

  export interface SolidityTestForkingConfig {
    url?: ResolvedConfigurationVariable;
    blockNumber?: bigint;
    rpcEndpoints?: Record<string, ResolvedConfigurationVariable>;
  }

  export interface SolidityTestConfig
    extends Omit<SolidityTestUserConfig, "forking"> {
    forking?: SolidityTestForkingConfig;
  }
  export interface HardhatTestConfig {
    solidity: SolidityTestConfig;
  }
}
