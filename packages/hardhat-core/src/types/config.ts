// This file defines the different config types.
//
// For each possible kind of config value, we have two type:
//
// One that starts with User, which represent the config as written in the
// user config.
//
// The other one, with the same name except for the User prefix, represents
// the resolved value as used during the hardhat execution.
//
// Note that while many declarations are repeated here (i.e. network types'
// fields), we don't use `extends` as that can interfere with plugin authors
// trying to augment the config types.

// Networks config

export interface UserNetworksConfig {
  hardhat?: UserHardhatNetworkConfig;
  [networkName: string]: UserNetworkConfig | undefined;
}

export type UserNetworkConfig =
  | UserHardhatNetworkConfig
  | UserHttpNetworkConfig;

export interface UserHardhatNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
  gasMultiplier?: number;
  hardfork?: string;
  accounts?: UserHardhatNetworkAccountsConfig;
  blockGasLimit?: number;
  throwOnTransactionFailures?: boolean;
  throwOnCallFailures?: boolean;
  allowUnlimitedContractSize?: boolean;
  initialDate?: string;
  loggingEnabled?: boolean;
  forking?: UserHardhatNetworkForkingConfig;
}

export type UserHardhatNetworkAccountsConfig =
  | UserHardhatNetworkAccountConfig[]
  | UserHardhatNetworkHDAccountsConfig;

export interface UserHardhatNetworkAccountConfig {
  privateKey: string;
  balance: string;
}

export interface UserHardhatNetworkHDAccountsConfig {
  mnemonic?: string;
  initialIndex?: number;
  count?: number;
  path?: string;
  accountsBalance?: string;
}

export interface UserHDAccountsConfig {
  mnemonic: string;
  initialIndex?: number;
  count?: number;
  path?: string;
}

export interface UserHardhatNetworkForkingConfig {
  enabled?: boolean;
  url: string;
  blockNumber?: number;
}

export type UserHttpNetworkAccountsConfig =
  | "remote"
  | string[]
  | UserHDAccountsConfig;

export interface UserHttpNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
  gasMultiplier?: number;
  url?: string;
  timeout?: number;
  httpHeaders?: { [name: string]: string };
  accounts?: UserHttpNetworkAccountsConfig;
}

export interface NetworksConfig {
  hardhat: HardhatNetworkConfig;
  localhost: HttpNetworkConfig;
  [networkName: string]: NetworkConfig;
}

export type NetworkConfig = HardhatNetworkConfig | HttpNetworkConfig;

export interface HardhatNetworkConfig {
  chainId: number;
  from?: string;
  gas: "auto" | number;
  gasPrice: "auto" | number;
  gasMultiplier: number;
  hardfork: string;
  accounts: HardhatNetworkAccountsConfig;
  blockGasLimit: number;
  throwOnTransactionFailures: boolean;
  throwOnCallFailures: boolean;
  allowUnlimitedContractSize: boolean;
  initialDate?: string;
  loggingEnabled: boolean;
  forking?: HardhatNetworkForkingConfig;
}

export type HardhatNetworkAccountsConfig = HardhatNetworkAccountConfig[];

// tslint:disable-next-line:no-empty-interface
export interface HardhatNetworkAccountConfig {
  privateKey: string;
  balance: string;
}

export interface HardhatNetworkForkingConfig {
  enabled: boolean;
  url: string;
  blockNumber?: number;
}

export interface HttpNetworkConfig {
  chainId?: number;
  from?: string;
  gas: "auto" | number;
  gasPrice: "auto" | number;
  gasMultiplier: number;
  url: string;
  timeout: number;
  httpHeaders: { [name: string]: string };
  accounts: HttpNetworkAccountsConfig;
}

export type HttpNetworkAccountsConfig =
  | "remote"
  | string[]
  | HttpNetworkHDAccountsConfig;

export interface HttpNetworkHDAccountsConfig {
  mnemonic: string;
  initialIndex: number;
  count: number;
  path: string;
}

// Project paths config

export interface UserProjectPaths {
  root?: string;
  cache?: string;
  artifacts?: string;
  sources?: string;
  tests?: string;
}

export interface ProjectPaths {
  root: string;
  configFile: string;
  cache: string;
  artifacts: string;
  sources: string;
  tests: string;
}

// Solidity config

export type UserSolidityConfig = string | UserSolcConfig | UserMultiSolcConfig;

export interface UserSolcConfig {
  version: string;
  settings?: any;
}

export interface UserMultiSolcConfig {
  compilers: UserSolcConfig[];
  overrides?: Record<string, UserSolcConfig>;
}

export interface SolcConfig {
  version: string;
  settings: any;
}

export interface SolidityConfig {
  compilers: SolcConfig[];
  overrides: Record<string, SolcConfig>;
}

// Hardhat config

export interface UserHardhatConfig {
  defaultNetwork?: string;
  paths?: UserProjectPaths;
  networks?: UserNetworksConfig;
  solidity?: UserSolidityConfig;
  mocha?: Mocha.MochaOptions;
}

export interface HardhatConfig {
  defaultNetwork: string;
  paths: ProjectPaths;
  networks: NetworksConfig;
  solidity: SolidityConfig;
  mocha: Mocha.MochaOptions;
}

// Plugins config functionality

export type ConfigExtender = (
  config: HardhatConfig,
  userConfig: Readonly<UserHardhatConfig>
) => void;
