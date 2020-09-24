import { EventEmitter } from "events";
import { DeepReadonly, Omit } from "ts-essentials";

import { MessageTrace } from "./internal/buidler-evm/stack-traces/message-trace";

// Begin config types

// IMPORTANT: This t.types MUST be kept in sync with the actual types.

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
  buidlerevm: HardhatNetworkConfig;
  [networkName: string]: NetworkConfig;
}

export interface ResolvedNetworks {
  buidlerevm: ResolvedHardhatNetworkConfig;
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

// End config types

// TODO-HH: Maybe we shouldn't place this here, as it will be possible to modify
//  the solc input with an override, and the type can easily get incompatible.
export interface SolcInput {
  settings: {
    metadata: { useLiteralContent: boolean };
    optimizer: SolcOptimizerConfig;
    outputSelection: { "*": { "": string[]; "*": string[] } };
    evmVersion?: string;
  };
  sources: { [p: string]: { content: string } };
  language: string;
}

/**
 * A function that receives a HardhatRuntimeEnvironment and
 * modify its properties or add new ones.
 */
export type EnvironmentExtender = (env: HardhatRuntimeEnvironment) => void;

export type ConfigExtender = (
  config: ResolvedHardhatConfig,
  userConfig: DeepReadonly<HardhatConfig>
) => void;

// NOTE: This is experimental and will be removed. Please contact our team
// if you are planning to use it.
export type ExperimentalBuidlerEVMMessageTraceHook = (
  bre: HardhatRuntimeEnvironment,
  trace: MessageTrace,
  isMessageTraceFromACall: boolean
) => Promise<void>;

// NOTE: This is experimental and will be removed. Please contact our team
// if you are planning to use it.
export type BoundExperimentalBuidlerEVMMessageTraceHook = (
  trace: MessageTrace,
  isMessageTraceFromACall: boolean
) => Promise<void>;

/**
 * This class is used to dynamically validate task's argument types.
 */
export interface ArgumentType<T> {
  /**
   * The type's name.
   */
  name: string;

  /**
   * Check if argument value is of type <T>.
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param argumentValue - value to be validated
   *
   * @throws BDLR301 if value is not of type <t>
   */
  validate(argName: string, argumentValue: any): void;
}

/**
 * This is a special case of ArgumentType.
 *
 * These types must have a human-friendly string representation, so that they
 * can be used as command line arguments.
 */
export interface CLIArgumentType<T> extends ArgumentType<T> {
  /**
   * Parses strValue into T. This function MUST throw BDLR301 if it
   * can parse the given value.
   *
   * @param argName argument's name - used for context in case of error.
   * @param strValue argument's string value to be parsed.
   */
  parse(argName: string, strValue: string): T;
}

export interface ConfigurableTaskDefinition {
  setDescription(description: string): this;

  setAction(action: ActionType<TaskArguments>): this;

  addParam<T>(
    name: string,
    description?: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalParam<T>(
    name: string,
    description?: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this;

  addPositionalParam<T>(
    name: string,
    description?: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalPositionalParam<T>(
    name: string,
    description?: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this;

  addVariadicPositionalParam<T>(
    name: string,
    description?: string,
    defaultValue?: T[],
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalVariadicPositionalParam<T>(
    name: string,
    description?: string,
    defaultValue?: T[],
    type?: ArgumentType<T>
  ): this;

  addFlag(name: string, description?: string): this;
}

export interface ParamDefinition<T> {
  name: string;
  defaultValue?: T;
  type: ArgumentType<T>;
  description?: string;
  isOptional: boolean;
  isFlag: boolean;
  isVariadic: boolean;
}

export interface OptionalParamDefinition<T> extends ParamDefinition<T> {
  defaultValue: T;
  isOptional: true;
}

export interface CLIOptionalParamDefinition<T>
  extends OptionalParamDefinition<T> {
  type: CLIArgumentType<T>;
}

export interface ParamDefinitionsMap {
  [paramName: string]: ParamDefinition<any>;
}

export interface TaskDefinition extends ConfigurableTaskDefinition {
  readonly name: string;
  readonly description?: string;
  readonly action: ActionType<TaskArguments>;
  readonly isInternal: boolean;

  // TODO: Rename this to something better. It doesn't include the positional
  // params, and that's not clear.
  readonly paramDefinitions: ParamDefinitionsMap;

  readonly positionalParamDefinitions: Array<ParamDefinition<any>>;
}

/**
 * @type TaskArguments {object-like} - the input arguments for a task.
 *
 * TaskArguments type is set to 'any' because it's interface is dynamic.
 * It's impossible in TypeScript to statically specify a variadic
 * number of fields and at the same time define specific types for\
 * the argument values.
 *
 * For example, we could define:
 * type TaskArguments = Record<string, any>;
 *
 * ...but then, we couldn't narrow the actual argument value's type in compile time,
 * thus we have no other option than forcing it to be just 'any'.
 */
export type TaskArguments = any;

export interface RunSuperFunction<ArgT extends TaskArguments> {
  (taskArguments?: ArgT): Promise<any>;
  isDefined: boolean;
}

export type ActionType<ArgsT extends TaskArguments> = (
  taskArgs: ArgsT,
  env: HardhatRuntimeEnvironment,
  runSuper: RunSuperFunction<ArgsT>
) => Promise<any>;

// Network types

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface ProviderMessage {
  readonly type: string;
  readonly data: unknown;
}

export interface EthSubscription extends ProviderMessage {
  readonly type: "eth_subscription";
  readonly data: {
    readonly subscription: string;
    readonly result: unknown;
  };
}

export interface ProviderConnectInfo {
  readonly chainId: string;
}

// TODO-HH: Improve the types
export interface EIP1193Provider extends EventEmitter {
  request(args: RequestArguments): Promise<unknown>;
}

export interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface EthereumProvider extends EIP1193Provider {
  send(method: string, params?: any[]): Promise<any>;
  sendAsync(
    payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ): void;
}

// This alias is here for backwards compatibility
export type IEthereumProvider = EthereumProvider;

export interface Network {
  name: string;
  config: ResolvedNetworkConfig;
  provider: EthereumProvider;
}

// Artifact types

export interface Artifact {
  _format: string;
  contractName: string;
  abi: any;
  bytecode: string; // "0x"-prefixed hex string
  deployedBytecode: string; // "0x"-prefixed hex string
  linkReferences: LinkReferences;
  deployedLinkReferences: LinkReferences;
}

export interface LinkReferences {
  [libraryFileName: string]: {
    [libraryName: string]: Array<{ length: number; start: number }>;
  };
}

// Hardhat Runtime Environment types

/**
 * Hardhat arguments:
 * * network: the network to be used.
 * * showStackTraces: flag to show stack traces.
 * * version: flag to show hardhat's version.
 * * help: flag to show hardhat's help message.
 * * emoji:
 * * config: used to specify hardhat's config file.
 */
export interface HardhatArguments {
  network?: string;
  showStackTraces: boolean;
  version: boolean;
  help: boolean;
  emoji: boolean;
  config?: string;
  verbose: boolean;
  maxMemory?: number;
}

export type BuidlerParamDefinitions = {
  [param in keyof Required<HardhatArguments>]: CLIOptionalParamDefinition<
    HardhatArguments[param]
  >;
};

export interface TasksMap {
  [name: string]: TaskDefinition;
}

export type RunTaskFunction = (
  name: string,
  taskArguments?: TaskArguments
) => Promise<any>;

export interface HardhatRuntimeEnvironment {
  readonly config: ResolvedHardhatConfig;
  readonly hardhatArguments: HardhatArguments;
  readonly tasks: TasksMap;
  readonly run: RunTaskFunction;
  readonly network: Network;
  // TODO-HH: Remove this deprectaed field
  readonly ethereum: EthereumProvider; // DEPRECATED: Use network.provider
}
