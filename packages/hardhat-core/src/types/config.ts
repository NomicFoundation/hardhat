// Networks config

export interface Networks {
  hardhat?: HardhatNetworkConfig;
  localhost?: LocalhostNetworkConfig;
  [networkName: string]: NetworkConfig | undefined;
}

export type NetworkConfig =
  | HardhatNetworkConfig
  | LocalhostNetworkConfig
  | HttpNetworkConfig;

export interface HardhatNetworkConfig extends CommonNetworkConfig {
  accounts?: HardhatNetworkConfigAccounts;
  blockGasLimit?: number;
  hardfork?: string;
  throwOnTransactionFailures?: boolean;
  throwOnCallFailures?: boolean;
  allowUnlimitedContractSize?: boolean;
  forking?: HardhatNetworkForkingConfig;
  loggingEnabled?: boolean;
  initialDate?: string;
}

export interface CommonNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
  gasMultiplier?: number;
}

export type HardhatNetworkConfigAccounts =
  | HardhatNetworkAccount[]
  | HardhatNetworkHDAccountsConfig;

export interface HardhatNetworkAccount {
  privateKey: string;
  balance: string;
}

export interface HardhatNetworkHDAccountsConfig
  extends Partial<HDAccountsConfig> {
  accountsBalance?: string;
}

export interface HDAccountsConfig {
  mnemonic: string;
  initialIndex?: number;
  count?: number;
  path?: string;
}

export interface HardhatNetworkForkingConfig {
  enabled?: boolean;
  url: string;
  blockNumber?: number;
}

export interface LocalhostNetworkConfig extends BaseHttpNetworkConfig {
  url?: string;
}

export interface BaseHttpNetworkConfig extends CommonNetworkConfig {
  timeout?: number;
  httpHeaders?: { [name: string]: string };
  accounts?: HttpNetworkConfigAccounts;
}

export type HttpNetworkConfigAccounts = "remote" | string[] | HDAccountsConfig;

export interface HttpNetworkConfig extends BaseHttpNetworkConfig {
  url: string;
}

export interface ResolvedNetworks {
  hardhat: ResolvedHardhatNetworkConfig;
  localhost: ResolvedLocalhostNetworkConfig;
  [networkName: string]: ResolvedNetworkConfig;
}

export type ResolvedNetworkConfig =
  | ResolvedHardhatNetworkConfig
  | ResolvedLocalhostNetworkConfig
  | ResolvedHttpNetworkConfig;

export interface ResolvedHardhatNetworkConfig
  extends Omit<
      Required<HardhatNetworkConfig>,
      "from" | "initialDate" | "forking"
    >,
    Pick<HardhatNetworkConfig, "from" | "initialDate" | "forking"> {
  accounts: ResolvedHardhatNetworkConfigAccounts;
  forking?: ResolvedHardhatNetworkForkingConfig;
}

export type ResolvedHardhatNetworkConfigAccounts = HardhatNetworkAccount[];

export interface ResolvedHardhatNetworkForkingConfig
  extends HardhatNetworkForkingConfig {
  enabled: boolean;
}

// tslint:disable-next-line:no-empty-interface
export interface ResolvedLocalhostNetworkConfig
  extends ResolvedHttpNetworkConfig {}

export interface ResolvedHttpNetworkConfig
  extends Omit<Required<HttpNetworkConfig>, "from" | "chainId">,
    Pick<HttpNetworkConfig, "from" | "chainId"> {
  accounts: ResolvedHttpNetworkConfigAccounts;
}

export type ResolvedHttpNetworkConfigAccounts =
  | "remote"
  | string[]
  | ResolvedHDAccountsConfig;

export interface ResolvedHDAccountsConfig extends Required<HDAccountsConfig> {}

// Project paths config

export interface ProjectPaths {
  root?: string;
  cache?: string;
  artifacts?: string;
  sources?: string;
  tests?: string;
}

export interface ResolvedProjectPaths extends Required<ProjectPaths> {
  configFile: string;
}

// Solidity config

export type SolidityConfig = string | SolcConfig | MultiSolcConfig;

export interface SolcConfig {
  version: string;
  settings?: any;
}

export interface MultiSolcConfig {
  compilers: SolcConfig[];
  overrides?: Record<string, SolcConfig>;
}

export interface ResolvedSolcConfig extends Required<SolcConfig> {}

export interface ResolvedSolidityConfig extends Required<MultiSolcConfig> {
  compilers: ResolvedSolcConfig[];
  overrides: Record<string, ResolvedSolcConfig>;
}

// Hardhat config

export interface HardhatConfig {
  defaultNetwork?: string;
  paths?: ProjectPaths;
  networks?: Networks;
  solidity?: SolidityConfig;
  mocha?: Mocha.MochaOptions;
}

export interface ResolvedHardhatConfig extends Required<HardhatConfig> {
  paths: ResolvedProjectPaths;
  networks: ResolvedNetworks;
  solidity: ResolvedSolidityConfig;
}

// Plugins config functionality

export type ConfigExtender = (
  config: ResolvedHardhatConfig,
  userConfig: Readonly<HardhatConfig>
) => void;
