import { BuidlerRuntimeEnvironment } from "./core/runtime-environment";
import { TaskDefinition } from "./core/tasks/task-definitions";
import { SolcOptimizerConfig } from "./solidity/compiler";
import { ResolvedFile } from "./solidity/resolver";
import { Omit } from "./util/common-types";

export interface GanacheOptions {
  gasLimit?: number;
  network_id?: number;
  mnemonic?: string;
  accounts?: Array<{ balance: string; secretKey: string }>;
}

interface CommonNetworkConfig {
  chainId?: number;
  from?: string;
  gas?: "auto" | number;
  gasPrice?: "auto" | number;
}

interface AutoNetworkAccount {
  privateKey: string;
  balance: string;
}

export interface AutoNetworkConfig extends CommonNetworkConfig {
  accounts?: AutoNetworkAccount[];
  blockGasLimit?: number;
  ganacheOptions?: GanacheOptions;
}

export interface HDAccountsConfig {
  mnemonic: string;
  initialIndex?: number;
  count?: number;
  path?: string;
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
  url: string;
  accounts?: NetworkConfigAccounts;
}

export type NetworkConfig = AutoNetworkConfig | HttpNetworkConfig;

export interface Networks {
  [networkName: string]: NetworkConfig;
}

export interface ProjectPaths {
  root: string;
  configFile: string;
  cache: string;
  artifacts: string;
  sources: string;
  [otherPath: string]: string;
}

export interface BuidlerConfig {
  networks?: Networks;
  paths?: Omit<Partial<ProjectPaths>, "configFile">;
  solc?: {
    version?: string;
    optimizer?: Partial<SolcOptimizerConfig>;
  };
  mocha?: Mocha.MochaOptions;
}

export interface ResolvedBuidlerConfig extends BuidlerConfig {
  paths: ProjectPaths;
  solc: {
    version: string;
    optimizer: SolcOptimizerConfig;
  };
}

export interface TasksMap {
  [name: string]: TaskDefinition;
}

export interface TaskArguments {
  [argumentName: string]: any;
}

export type RunTaskFunction = (
  name: string,
  taskArguments?: TaskArguments
) => Promise<any>;

export type RunSuperFunction<ArgT extends TaskArguments> = (
  taskArguments?: ArgT
) => Promise<any>;

// TODO: This may be wrong. Maybe it should be just TaskArguments. The thing
// is that doing that won't allow us to type the task definitions with more
// specific types.
export type ActionType<ArgsT extends TaskArguments> = (
  taskArgs: ArgsT,
  env: BuidlerRuntimeEnvironment,
  runSuper: RunSuperFunction<ArgsT>
) => Promise<any>;

export type GlobalWithBuidlerRuntimeEnvironment = NodeJS.Global & {
  env: BuidlerRuntimeEnvironment;
};

export interface ResolvedFilesMap {
  [globalName: string]: ResolvedFile;
}

export type EnvironmentExtender = (env: BuidlerRuntimeEnvironment) => void;
