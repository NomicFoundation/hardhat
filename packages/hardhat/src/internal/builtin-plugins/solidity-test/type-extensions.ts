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
    timeout?: number | bigint;
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
    timeout?: number | bigint;
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
    memoryLimit?: number | bigint;
    blockGasLimit?: number | bigint | false;
    transactionGasCap?: number | bigint | false;
    fuzz?: SolidityTestFuzzUserConfig;
    invariant?: SolidityTestInvariantUserConfig;
    forking?: SolidityTestForkingUserConfig;
    /**
     * Controls which sources the EIP-712 cheatcodes collect struct
     * definitions from.
     *
     * Every struct that a test source reaches is collected, through its
     * dependencies as well. A file matched by an `exclude` glob is left out,
     * which is how a clash between two reachable structs is settled.
     *
     * The globs are matched against each file's path relative to the project
     * root, with forward slashes, so a dependency is addressed as
     * `node_modules/<package>/...`, written without a leading `./` or `/`. A
     * file outside the project root is matched by its absolute path.
     */
    eip712Types?: {
      exclude?: string[];
    };
  }

  export interface SolidityTestProfilesUserConfig {
    profiles: Record<string, SolidityTestProfileUserConfig>;
  }

  export type SolidityTestUserConfig =
    SolidityTestProfileUserConfig | SolidityTestProfilesUserConfig;

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
    timeout?: number;
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
    timeout?: number;
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
    memoryLimit?: bigint;
    blockGasLimit?: number | bigint | false;
    transactionGasCap?: number | bigint | false;
    fuzz: SolidityTestFuzzConfig;
    invariant?: SolidityTestInvariantConfig;
    forking?: SolidityTestForkingConfig;
    /**
     * Controls which sources the EIP-712 cheatcodes collect struct
     * definitions from.
     *
     * Every struct that a test source reaches is collected, through its
     * dependencies as well. A file matched by an `exclude` glob is left out,
     * which is how a clash between two reachable structs is settled.
     *
     * The globs are matched against each file's path relative to the project
     * root, with forward slashes, so a dependency is addressed as
     * `node_modules/<package>/...`, written without a leading `./` or `/`. A
     * file outside the project root is matched by its absolute path.
     */
    eip712Types: {
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
