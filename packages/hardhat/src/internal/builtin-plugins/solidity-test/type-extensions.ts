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
  export interface SolidityTestFuzzConfigBase {
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

  export interface SolidityTestFuzzConfig extends SolidityTestFuzzConfigBase {
    seed: string;
  }

  export interface SolidityTestProfileConfigBase {
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
    gasLimit?: bigint;
    blockGasLimit?: bigint | false;

    fuzz?: SolidityTestFuzzConfigBase;
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

    eip712Types?: {
      include?: string[];
      exclude?: string[];
    };
  }

  export interface SolidityTestForkingUserConfig {
    url?: SensitiveString;
    blockNumber?: number | bigint;
    rpcEndpoints?: Record<string, SensitiveString>;
  }

  export interface SolidityTestProfileUserConfig
    extends SolidityTestProfileConfigBase {
    forking?: SolidityTestForkingUserConfig;
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

  export interface SolidityTestForkingConfig {
    url?: ResolvedConfigurationVariable;
    blockNumber?: bigint;
    rpcEndpoints?: Record<string, ResolvedConfigurationVariable>;
  }

  export interface SolidityTestProfileConfig
    extends SolidityTestProfileConfigBase {
    fuzz: SolidityTestFuzzConfig;
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
