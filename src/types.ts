import { BuidlerRuntimeEnvironment } from "./core/runtime-environment";
import { ITaskDefinition } from "./core/tasks/TaskDefinition";
import { SolcOptimizerConfig } from "./solidity/compiler";
import { ResolvedFile } from "./solidity/resolver";

export interface GanacheOptions {
  gasLimit: number;
  network_id: number;
  mnemonic?: string;
  accounts?: Array<{ balance: string; secretKey: string }>;
}

interface AutoNetworkAccount {
  privateKey: string;
  balance: string;
}

export interface AutoNetworkConfig {
  accounts: AutoNetworkAccount[];
  blockGasLimit: number;
  ganacheOptions?: GanacheOptions;
}

export interface HttpNetworkConfig {
  host: string;
  port?: number;
}

export type NetworkConfig = (AutoNetworkConfig | HttpNetworkConfig) & {
  from?: string;
  gas?: number;
  gasPrice?: number;
};

interface Networks {
  [networkName: string]: NetworkConfig;
}

export interface BuidlerConfig {
  networks: Networks;
  paths: {
    root: string;
    configFile: string;
    cache: string;
    artifacts: string;
    sources: string;
  };
  solc: {
    version: string;
    optimizer: SolcOptimizerConfig;
  };
  mocha: Mocha.MochaOptions;
}

export interface TasksMap {
  [name: string]: ITaskDefinition;
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

// TODO: This should go away once this gets fixed:
// https://github.com/xf00f/web3x/issues/13
export interface FixedJsonRPCResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
