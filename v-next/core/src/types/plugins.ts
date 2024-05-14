import { HardhatHooks } from "./hooks.js";

// We add the plugins to the config with a module augmentation
// to keep everything plugin-related here, and at the same time
// to avoid a circular dependency and/or having
// a huge file with everything.
declare module "./config.js" {
  export interface HardhatUserConfig {
    plugins?: HardhatPlugin[];
  }

  export interface HardhatConfig {
    // The plugins in a topological order
    plugins: HardhatPlugin[];
  }
}

/**
 * A Hardhat plugin.
 */
export interface HardhatPlugin {
  /**
   * A unique id of the plugin.
   */
  id: string;

  /**
   * The npm package where the plugin is located, if any.
   */
  npmPackage?: string;

  /**
   * An object with the different hook handlers that this plugin defines.
   *
   * The complete list of hooks is defined in the type `HardhatHooks`, which the
   * plugins that you depend on can extend.
   *
   * There's an entry for each hook category, that is, an entry for every entry
   * in `HardhatHooks`.
   *
   * Each entry defines a `HookHandlerCategoryFactory`, which is an async
   * function that returns a `HookHandlerCategory` object.
   *
   * Each `HookHandlerCategoryFactory` is called lazily, when needed, and at
   * most once per instance of the `HardhatRuntimeEnvironment`.
   *
   * These object contain handlers for one or more hooks in that category.
   *
   * For example, the entry `config` can defined a `HookHandlerCategoryFactory`
   * returning an object with a handler for the `extendUserConfig` hook.
   *
   * You can define each factory in two ways:
   *  - As an inline function.
   *  - As a string with the path to a file that exports the factory as `default`.
   *
   * The first option should only be used for development. You MUST use the second
   * option for production.
   */
  hookHandlers?: HookHandlerCategoryFactories;

  /**
   * An arary of plugins that this plugins depends on.
   */
  dependencies?: HardhatPlugin[];
}

/**
 * An object with the factories for the different hook handler categories that a plugin can define.
 *
 * @see HardhatPlugin#hookHandlers
 */
export type HookHandlerCategoryFactories = {
  [HookCategoryNameT in keyof HardhatHooks]?:
    | HookHandlerCategoryFactory<HookCategoryNameT>
    | string;
};

/**
 * A function that returns a `HookHandlerCategory` object, containing handlers
 * for one or more hooks of a certain category.
 *
 * A factory is called lazily, when needed, and at most once per instance of the
 * `HardhatRuntimeEnvironment`.
 *
 * @see HardhatPlugin#hookHandlers
 */
export type HookHandlerCategoryFactory<
  CategoryNameT extends keyof HardhatHooks,
> = () => Promise<Partial<HardhatHooks[CategoryNameT]>>;
