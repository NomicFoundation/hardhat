// Networks config

export interface UserNetworksConfig {
  hardhat?: UserHardhatNetworkConfig;
  localhost?: UserLocalhostNetworkConfig;
  [networkName: string]: UserNetworkConfig | undefined;
}

export type UserNetworkConfig =
  | UserHardhatNetworkConfig
  | UserLocalhostNetworkConfig
  | UserHttpNetworkConfig;

export interface UserHardhatNetworkConfig extends CommonUserNetworkConfig {
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

export interface CommonUserNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
  gasMultiplier?: number;
}

export type UserHardhatNetworkAccountsConfig =
  | UserHardhatNetworkAccountConfig[]
  | UserHardhatNetworkHDAccountsConfig;

export interface UserHardhatNetworkAccountConfig {
  privateKey: string;
  balance: string;
}

export interface UserHardhatNetworkHDAccountsConfig
  extends Partial<UserHDAccountsConfig> {
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

export interface UserLocalhostNetworkConfig extends BaseUserHttpNetworkConfig {
  url?: string;
}

export interface BaseUserHttpNetworkConfig extends CommonUserNetworkConfig {
  timeout?: number;
  httpHeaders?: { [name: string]: string };
  accounts?: UserHttpNetworkAccountsConfig;
}

export type UserHttpNetworkAccountsConfig =
  | "remote"
  | string[]
  | UserHDAccountsConfig;

export interface UserHttpNetworkConfig extends BaseUserHttpNetworkConfig {
  url: string;
}

export interface NetworksConfig {
  hardhat: HardhatNetworkConfig;
  localhost: LocalhostNetworkConfig;
  [networkName: string]: NetworkConfig;
}

export type NetworkConfig =
  | HardhatNetworkConfig
  | LocalhostNetworkConfig
  | HttpNetworkConfig;

export interface HardhatNetworkConfig
  extends Omit<
      Required<UserHardhatNetworkConfig>,
      "from" | "initialDate" | "forking"
    >,
    Pick<UserHardhatNetworkConfig, "from" | "initialDate" | "forking"> {
  accounts: HardhatNetworkAccountsConfig;
  forking?: HardhatNetworkForkingConfig;
}

export type HardhatNetworkAccountsConfig = HardhatNetworkAccountConfig[];

// tslint:disable-next-line:no-empty-interface
export interface HardhatNetworkAccountConfig
  extends UserHardhatNetworkAccountConfig {}

export interface HardhatNetworkForkingConfig
  extends UserHardhatNetworkForkingConfig {
  enabled: boolean;
}

// tslint:disable-next-line:no-empty-interface
export interface LocalhostNetworkConfig extends HttpNetworkConfig {}

export interface HttpNetworkConfig
  extends Omit<Required<UserHttpNetworkConfig>, "from" | "chainId">,
    Pick<UserHttpNetworkConfig, "from" | "chainId"> {
  accounts: HttpNetworkAccountsConfig;
}

export type HttpNetworkAccountsConfig = "remote" | string[] | HDAccountsConfig;

export interface HDAccountsConfig extends Required<UserHDAccountsConfig> {}

// Project paths config

export interface UserProjectPaths {
  root?: string;
  cache?: string;
  artifacts?: string;
  sources?: string;
  tests?: string;
}

export interface ProjectPaths extends Required<UserProjectPaths> {
  configFile: string;
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

export interface SolcConfig extends Required<UserSolcConfig> {}

export interface SolidityConfig extends Required<UserMultiSolcConfig> {
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

export interface HardhatConfig extends Required<UserHardhatConfig> {
  paths: ProjectPaths;
  networks: NetworksConfig;
  solidity: SolidityConfig;
}

// Plugins config functionality

export type ConfigExtender = (
  config: HardhatConfig,
  userConfig: Readonly<UserHardhatConfig>
) => void;
