import { Artifacts } from "./artifacts";
import { HardhatConfig, HardhatUserConfig, NetworkConfig } from "./config";
import { EthereumProvider } from "./provider";

/**
 * This class is used to dynamically validate task's argument types.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
   * @throws HH301 if value is not of type <t>
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
   * Parses strValue into T. This function MUST throw HH301 if it
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
  readonly isSubtask: boolean;

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

export interface HardhatArguments {
  network?: string;
  showStackTraces: boolean;
  version: boolean;
  help: boolean;
  emoji: boolean;
  config?: string;
  verbose: boolean;
  maxMemory?: number;
  tsconfig?: string;
}

export type HardhatParamDefinitions = {
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
  readonly config: HardhatConfig;
  readonly userConfig: HardhatUserConfig;
  readonly hardhatArguments: HardhatArguments;
  readonly tasks: TasksMap;
  readonly run: RunTaskFunction;
  readonly network: Network;
  readonly artifacts: Artifacts;
}

export interface Network {
  name: string;
  config: NetworkConfig;
  provider: EthereumProvider;
}

/**
 * A function that receives a HardhatRuntimeEnvironment and
 * modify its properties or add new ones.
 */
export type EnvironmentExtender = (env: HardhatRuntimeEnvironment) => void;
