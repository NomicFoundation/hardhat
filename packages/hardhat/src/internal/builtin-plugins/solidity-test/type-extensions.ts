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
  export interface SolidityTestFsPermissionsUserConfig {
    readWriteFile?: string[];
    readFile?: string[];
    writeFile?: string[];
    dangerouslyReadWriteDirectory?: string[];
    readDirectory?: string[];
    dangerouslyWriteDirectory?: string[];
  }

  export interface SolidityTestInvariantUserConfig {
    failurePersistDir?: string;
    runs?: number;
    depth?: number;
    failOnRevert?: boolean;
    callOverride?: boolean;
    dictionaryWeight?: number;
    includeStorage?: boolean;
    includePushBytes?: boolean;
    shrinkRunLimit?: number;
  }

  export interface SolidityTestFuzzUserConfig {
    failurePersistDir?: string;
    failurePersistFile?: string;
    runs?: number;
    maxTestRejects?: number;
    seed?: string;
    dictionaryWeight?: number;
    includeStorage?: boolean;
    includePushBytes?: boolean;
    showLogs?: boolean;
  }

  export interface SolidityTestForkingUserConfig {
    url?: SensitiveString;
    blockNumber?: number | bigint;
    rpcEndpoints?: Record<string, SensitiveString>;
  }

  export interface SolidityTestProfileUserConfig {
    fsPermissions?: SolidityTestFsPermissionsUserConfig;
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
    gasLimit?: bigint;
    blockGasLimit?: number | bigint | false;
    transactionGasCap?: number | bigint | false;
    fuzz?: SolidityTestFuzzUserConfig;
    invariant?: SolidityTestInvariantUserConfig;
    forking?: SolidityTestForkingUserConfig;
    eip712Types?: {
      include?: string[];
      exclude?: string[];
    };
  }

  export interface SolidityTestProfilesUserConfig {
    profiles: Record<string, SolidityTestProfileUserConfig>;
  }

  export type SolidityTestUserConfig =
    | SolidityTestProfileUserConfig
    | SolidityTestProfilesUserConfig;

  export interface HardhatTestUserConfig {
    solidity?: SolidityTestUserConfig;
  }

  export interface SolidityTestFsPermissionsConfig {
    readWriteFile?: string[];
    readFile?: string[];
    writeFile?: string[];
    dangerouslyReadWriteDirectory?: string[];
    readDirectory?: string[];
    dangerouslyWriteDirectory?: string[];
  }

  export interface SolidityTestInvariantConfig {
    failurePersistDir?: string;
    runs?: number;
    depth?: number;
    failOnRevert?: boolean;
    callOverride?: boolean;
    dictionaryWeight?: number;
    includeStorage?: boolean;
    includePushBytes?: boolean;
    shrinkRunLimit?: number;
  }

  export interface SolidityTestFuzzConfig {
    failurePersistDir?: string;
    failurePersistFile?: string;
    runs?: number;
    maxTestRejects?: number;
    seed: string;
    dictionaryWeight?: number;
    includeStorage?: boolean;
    includePushBytes?: boolean;
    showLogs?: boolean;
  }

  export interface SolidityTestForkingConfig {
    url?: ResolvedConfigurationVariable;
    blockNumber?: bigint;
    rpcEndpoints?: Record<string, ResolvedConfigurationVariable>;
  }

  export interface SolidityTestProfileConfig {
    rpcCachePath: string;
    fsPermissions?: SolidityTestFsPermissionsConfig;
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
    gasLimit?: bigint;
    blockGasLimit?: number | bigint | false;
    transactionGasCap?: number | bigint | false;
    fuzz: SolidityTestFuzzConfig;
    invariant?: SolidityTestInvariantConfig;
    forking?: SolidityTestForkingConfig;
    eip712Types: {
      include: string[];
      exclude: string[];
    };
  }

  export interface SolidityTestConfig {
    profiles: Record<string, SolidityTestProfileConfig>;
  }

  export interface HardhatTestConfig {
    solidity: SolidityTestConfig;
  }
}
