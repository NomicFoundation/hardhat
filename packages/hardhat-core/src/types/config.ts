import { DeepReadonly } from "ts-essentials";

export interface CommonNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
  gasMultiplier?: number;
}

export interface HardhatNetworkAccount {
  privateKey: string;
  balance: string;
}

export interface HardhatNetworkConfig extends CommonNetworkConfig {
  accounts?: HardhatNetworkAccount[] | HardhatNetworkHDAccountsConfig;
  blockGasLimit?: number;
  hardfork?: string;
  throwOnTransactionFailures?: boolean;
  throwOnCallFailures?: boolean;
  loggingEnabled?: boolean;
  allowUnlimitedContractSize?: boolean;
  initialDate?: string;
  forking?: {
    enabled?: boolean;
    url?: string;
    blockNumber?: number;
  };
}

export interface ResolvedHardhatNetworkConfig extends HardhatNetworkConfig {
  accounts: HardhatNetworkAccount[];
}

export interface HDAccountsConfig {
  mnemonic: string;
  initialIndex?: number;
  count?: number;
  path?: string;
}

export interface HardhatNetworkHDAccountsConfig extends HDAccountsConfig {
  accountsBalance?: string;
}

export interface OtherAccountsConfig {
  type: string;
}

export type NetworkConfigAccounts =
  | "remote"
  | string[]
  | HDAccountsConfig
  | OtherAccountsConfig;

export interface HttpNetworkConfig extends CommonNetworkConfig {
  url?: string;
  timeout?: number;
  httpHeaders?: { [name: string]: string };
  accounts?: NetworkConfigAccounts;
}

export interface ResolvedHttpNetworkConfig extends HttpNetworkConfig {
  url: string;
}

export type NetworkConfig = HardhatNetworkConfig | HttpNetworkConfig;

export type ResolvedNetworkConfig =
  | ResolvedHardhatNetworkConfig
  | ResolvedHttpNetworkConfig;

export interface Networks {
  hardhat: HardhatNetworkConfig;
  [networkName: string]: NetworkConfig;
}

export interface ResolvedNetworks {
  hardhat: ResolvedHardhatNetworkConfig;
  [networkName: string]: ResolvedNetworkConfig;
}

/**
 * The project paths:
 * * root: the project's root.
 * * configFile: the hardhat's config filepath.
 * * cache: project's cache directory.
 * * artifacts: artifact's directory.
 * * sources: project's sources directory.
 * * tests: project's tests directory.
 */
export interface ProjectPaths {
  root: string;
  configFile: string;
  cache: string;
  artifacts: string;
  sources: string;
  tests: string;
}

export interface SolcConfig {
  version: string;
  settings?: any;
}

export interface MultiSolcConfig {
  compilers: SolcConfig[];
  overrides?: Record<string, SolcConfig>;
}

export type SolidityConfig = string | SolcConfig | MultiSolcConfig;

export interface SolcOptimizerConfig {
  enabled: boolean;
  runs: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
}

export interface HardhatConfig {
  defaultNetwork?: string;
  networks?: Networks;
  paths?: Omit<Partial<ProjectPaths>, "configFile">;
  solidity?: SolidityConfig;
  mocha?: Mocha.MochaOptions;
  analytics?: Partial<AnalyticsConfig>;
}

export interface ResolvedHardhatConfig extends HardhatConfig {
  defaultNetwork: string;
  paths: ProjectPaths;
  networks: ResolvedNetworks;
  analytics: AnalyticsConfig;
  solidity: MultiSolcConfig;
}

export type ConfigExtender = (
  config: ResolvedHardhatConfig,
  userConfig: DeepReadonly<HardhatConfig>
) => void;
