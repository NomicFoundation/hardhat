import type {
  ConfigurationVariable,
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
} from "./config.js";
import type { HardhatRuntimeEnvironment } from "./hre.js";
import type {
  LastParameter,
  ParametersExceptFirst,
  ParametersExceptFirstAndLast,
  ParametersExceptLast,
  Params,
  Return,
} from "./utils.js";

// We add the HookManager to the HRE with a module augmentation to avoid
// introducing a circular dependency that would look like this:
// hre.ts -> hooks.ts -> hre.ts
declare module "./hre.js" {
  export interface HardhatRuntimeEnvironment {
    readonly hooks: HookManager;
  }
}

/**
 * The context that is passed to hook handlers, except for those in the "config"
 * category.
 *
 * The `HookContext` offers a subset of the functionality that the
 * `HardhatRuntimeEnvironment` does.
 */
export type HookContext = Omit<HardhatRuntimeEnvironment, "tasks">;

/**
 * The different hooks that a plugin can define handlers for.
 *
 * Each of the entries in this interface is a category of hooks, and each of
 * those categories is an object with the hooks in that category.
 */
export interface HardhatHooks {
  config: ConfigHooks;
  userInterruptions: UserInterruptionHooks;
  configurationVariables: ConfigurationVariableHooks;
  hre: HardhatRuntimeEnvironmentHooks;
}

/**
 * Config-related hooks.
 */
export interface ConfigHooks {
  /**
   * Provide a handler for this hook to extend the user's config, before any
   * validation or resolution is done.
   *
   * @param config The user's config.
   * @param next A function to call the next handler for this hook.
   * @returns The extended config.
   */
  extendUserConfig: (
    config: HardhatUserConfig,
    next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
  ) => Promise<HardhatUserConfig>;

  /**
   * Provide a handler for this hook to validate the user's config.
   *
   * @param config The user's config.
   * @returns An array of validation errors.
   */
  validateUserConfig: (
    config: HardhatUserConfig,
  ) => Promise<HardhatUserConfigValidationError[]>;

  /**
   * Provide a handler for this hook to resolve parts of the user's config into
   * the final HardhatConfig.
   *
   * To use this hook, plugins are encouraged to call `next(config)` first, and
   * construct a resolved config based on its result. Note that while that
   * result is typed as `HardhatConfig`, it may actually be incomplete, as other
   * plugins may not have resolved their parts of the config yet.
   *
   * @param userConfig The user's config.
   * @param next A function to call the next handler for this hook.
   * @returns The resolved config.
   */
  resolveUserConfig: (
    userConfig: HardhatUserConfig,
    resolveConfigurationVariable: ConfigurationVariableResolver,
    next: (
      nextUserConfig: HardhatUserConfig,
      nextResolveConfigurationVariable: ConfigurationVariableResolver,
    ) => Promise<HardhatConfig>,
  ) => Promise<HardhatConfig>;
}

/**
 * A `HardhatUserConfig` validation error.
 */
export interface HardhatUserConfigValidationError {
  /**
   * The path from the config object to the value that originated this
   * validation error.
   *
   * For example, if `config.networks.localhost.url` is invalid, this array
   * would be `["networks", "localhost", "url"]`.
   */
  path: Array<string | number>;

  /**
   * The error message.
   */
  message: string;
}

/**
 * ConfigurationVariable-related hooks.
 */
export interface ConfigurationVariableHooks {
  /**
   * Provide a handler for this hook to customize how to fetch the value
   * that a configuration variable represents.
   *
   * @param context The hook context.
   * @param variable The configuration variable or string to resolve.
   * @param next A function to call if the handler decides to not handle the
   *  resolution of this variable.
   */
  fetchValue: (
    context: HookContext,
    variable: ConfigurationVariable,
    next: (
      nextContext: HookContext,
      nextVariable: ConfigurationVariable,
    ) => Promise<string>,
  ) => Promise<string>;
}

/**
 * User interruptions-related hooks.
 */
export interface UserInterruptionHooks {
  /**
   * Provide a handler for this hook to customize how the
   * `UserInterruptionManager` displays messages to the user.
   *
   * @see UserInterruptionManager#displayMessage to understand when the returned
   *  promise should be resolved.
   *
   * @param context The hook context.
   * @param interruptor A name or description of the module trying to display
   *  the message.
   * @param message The message to display.
   * @param next A function to call if the handler decides to not handle the
   *  message.
   */
  displayMessage: (
    context: HookContext,
    interruptor: string,
    message: string,
    next: (
      nextContext: HookContext,
      nextInterruptor: string,
      nextMesage: string,
    ) => Promise<void>,
  ) => Promise<void>;

  /**
   * Provide a handler for this hook to customize how the
   * `UserInterruptionManager` requests input from the user.
   *
   * @param context The hook context.
   * @param interruptor A name or description of the module trying to request
   *  input form the user.
   * @param inputDescription A description of the input that is being
   *  requested.
   * @param next A function to call if the handler decides to not handle the
   *  input request.
   */
  requestInput: (
    context: HookContext,
    interruptor: string,
    inputDescription: string,
    next: (
      nextContext: HookContext,
      nextInterruptor: string,
      nextInputDescription: string,
    ) => Promise<string>,
  ) => Promise<string>;

  /**
   * Provide a handler for this hook to customize how the
   * `UserInterruptionManager` requests a secret input from the user.
   *
   * Note that handlers for this hook should take care of to not display the
   * user's input in the terminal, and not leak it in any way.
   *
   * @param context The hook context.
   * @param interruptor A name or description of the module trying to request
   *  input form the user.
   * @param inputDescription A description of the input that is being
   *  requested.
   * @param next A function to call if the handler decides to not
   *  handle the input request.
   */
  requestSecretInput: (
    context: HookContext,
    interruptor: string,
    inputDescription: string,
    next: (
      nextContext: HookContext,
      nextInterruptor: string,
      nextInputDescription: string,
    ) => Promise<string>,
  ) => Promise<string>;
}

/**
 * Hardhat Runtime Environment-related hooks.
 */
export interface HardhatRuntimeEnvironmentHooks {
  created: (
    context: HookContext,
    hre: HardhatRuntimeEnvironment,
  ) => Promise<void>;
}

/**
 * An interface with utilities to interact with hooks and their handlers.
 *
 * This interface provides methods to fetch and run hook handlers, as well as
 * registering and unregistering dynamic ones.
 *
 * Using this `HookManager` you can run a hook's handlers in a few different
 * common execution patterns:
 *  - As a chain of responsibility, where each handler can optionally call the
 *    next one.
 *  - In order, where all handlers are called in the order that `getHooks`
 *    returns them.
 *  - In parallel, where all handlers are called at the same time.
 */
export interface HookManager {
  /**
   * Registers handlers for a category of hooks.
   */
  registerHandlers<HookCategoryNameT extends keyof HardhatHooks>(
    hookCategoryName: HookCategoryNameT,
    hookCategory: Partial<HardhatHooks[HookCategoryNameT]>,
  ): void;

  /**
   * Removes previously registered handlers.
   */
  unregisterHandlers<HookCategoryNameT extends keyof HardhatHooks>(
    hookCategoryName: HookCategoryNameT,
    hookCategory: Partial<HardhatHooks[HookCategoryNameT]>,
  ): void;

  /**
   * Runs the existing handlers of a hook in a chained fashion.
   *
   * This chain has the following priority order:
   *  - Dynamically registered handlers come first, in the reverse order they
   *   were registered.
   *  - Plugin handlers come last, in the same reverse of the resolved plugins
   *  list, as seen in `HardhatConfig#plugins`.
   *  - The default handler is called last.
   *
   * The first handler is called with `initialParams`, and then it can call
   * `next` to call the next handler in the chain.
   *
   * For a hook to work with this method, it should look like this:
   *
   * `(arg1: Type1, ..., argN: TypeN, next: (a1: Type1, ..., aN: TypeN) => Promise<ReturnType>) => Promise<ReturnType>`
   *
   * Note that `next` MUST NOT be called more than once in any handler.
   *
   * @param hookCategoryName The name of the category of the hook whose
   *  handlers should be run.
   * @param hookName The name of the hook whose handlers should be run.
   * @param initialParams The params to pass to the first handler that is run.
   * @param defaultImplementation The last handler in the chain. This can be thought
   *  as the behavior that this execution should have in the absense of any
   *  handler.
   * @returns The result of executing the chained handlers.
   */
  runHandlerChain<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends ChainedHook<HardhatHooks[HookCategoryNameT][HookNameT]>,
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    initialParams: InitialChainedHookParams<HookCategoryNameT, HookT>,
    defaultImplementation: LastParameter<HookT>,
  ): Promise<Awaited<Return<HookT>>>;

  /**
   * Runs all the handlers for a hook in the following priority order:
   *  - Plugin handlers come first, in the resolved order of the plugins
   *  list, hence if B has a dependency on A, the order will be A then B.
   *  - Dynamically registered handlers come last, in the order they
   *  were registered.
   *
   * @param hookCategoryName The name of the category of the hook whose
   *  handlers should be run.
   * @param hookName The name of the hook to run.
   * @param params The params to pass to the hooks.
   */
  runSequentialHandlers<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends HardhatHooks[HookCategoryNameT][HookNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    params: InitialHookParams<HookCategoryNameT, HookT>,
  ): Promise<Array<Awaited<Return<HookT>>>>;

  /**
   * Runs all the handlers for a hook in parallel.
   *
   * @param hookCategoryName The name of the category of the hook whose
   *  handlers should be run.
   * @param hookName The name of the hook to run.
   * @param params The params to pass to the hooks.
   */
  runParallelHandlers<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends HardhatHooks[HookCategoryNameT][HookNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    params: InitialHookParams<HookCategoryNameT, HookT>,
  ): Promise<Array<Awaited<Return<HookT>>>>;
}

/**
 * Utility to get a type only if A and B are equal.
 */
export type IfEqual<A, B, Result> = [A] extends [B]
  ? [B] extends [A]
    ? Result
    : never
  : never;

/**
 * A chained hook or never.
 */
export type ChainedHook<HookT> = HookT extends (
  ...params: [
    ...infer ParamsT,
    next: (...paramasNext: infer NextParamsT) => infer NextRetT,
  ]
) => infer RetT
  ? IfEqual<ParamsT, NextParamsT, IfEqual<RetT, NextRetT, HookT>>
  : never;

/**
 * The intial parameters to run a chain of hooks.
 */
export type InitialChainedHookParams<
  HookCategoryNameT extends keyof HardhatHooks,
  HookT,
> = HookCategoryNameT extends "config"
  ? ParametersExceptLast<HookT>
  : ParametersExceptFirstAndLast<HookT>;

/**
 * The initial parameters to run hooks either sequentially or in parallel.
 */
export type InitialHookParams<
  HookCategoryNameT extends keyof HardhatHooks,
  HookT,
> = HookCategoryNameT extends "config"
  ? Params<HookT>
  : ParametersExceptFirst<HookT>;
