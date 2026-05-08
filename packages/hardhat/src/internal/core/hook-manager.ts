/* eslint-disable @typescript-eslint/consistent-type-assertions -- Typescript
can handle the generic types in this file correctly. It can do it for function
signatures, but not for function bodies. */
import type {
  ChainedHook,
  HookContext,
  HookManager,
  InitialHookParams as InitialHookParams,
  InitialChainedHookParams,
  HardhatHooks,
} from "../../types/hooks.js";
import type { HardhatPlugin } from "../../types/plugins.js";
import type { LastParameter, Return } from "../../types/utils.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { detectPluginNpmDependencyProblems } from "./plugins/detect-plugin-npm-dependency-problems.js";

export class HookManagerImplementation implements HookManager {
  readonly #mutex: AsyncMutex = new AsyncMutex();

  readonly #projectRoot: string;

  /**
   * The context passed to hook handlers, except to the `config` ones, to break
   * a circular dependency between the config and the hook handler.
   *
   * Initially `undefined` to be able to run the config hooks during
   * initialization.
   */
  #context: HookContext | undefined;

  /**
   * Plugins that provide hook handlers for each category, in reverse order.
   *
   * Precomputed from the plugin list at construction.
   */
  readonly #pluginsByHookCategory: Map<keyof HardhatHooks, HardhatPlugin[]> =
    new Map();

  /**
   * Cached resolved category objects per hook category in reverse plugin
   * order.
   *
   * Only written by #getStaticHookHandlerCategories, which uses a mutex to
   * ensure that every Hook Category Factory is run once per HookManager
   * instance.
   */
  readonly #resolvedStaticCategories: Map<
    keyof HardhatHooks,
    Array<Partial<HardhatHooks[keyof HardhatHooks]>>
  > = new Map();

  /**
   * A map of the dynamically registered handler categories.
   *
   * Each array is a list of categories, in reverse order of registration.
   *
   * Written by registerHandlers and unregisterHandlers.
   */
  readonly #dynamicHookHandlerCategories: Map<
    keyof HardhatHooks,
    Array<Partial<HardhatHooks[keyof HardhatHooks]>>
  > = new Map();

  /**
   * Cached combined (dynamic + static) handlers per (category, hook name) in
   * chained running order.
   *
   * Only written by #getHandlersInChainedRunningOrder, and invalidated
   * per-category on dynamic handlers register/unregister.
   */
  readonly #chainedHandlers: Map<keyof HardhatHooks, Map<string, any[]>> =
    new Map();

  /**
   * Cached combined handlers per (category, hook name) in sequential running
   * order (reverse of chained).
   *
   * Only written by #getHandlersInSequentialRunningOrder, and invalidated
   * per-category on dynamic handlers register/unregister.
   */
  readonly #sequentialHandlers: Map<keyof HardhatHooks, Map<string, any[]>> =
    new Map();

  constructor(projectRoot: string, plugins: HardhatPlugin[]) {
    this.#projectRoot = projectRoot;

    for (const plugin of plugins.toReversed()) {
      if (plugin.hookHandlers === undefined) {
        continue;
      }

      for (const hookCategoryName of Object.keys(plugin.hookHandlers) as Array<
        keyof HardhatHooks
      >) {
        if (plugin.hookHandlers[hookCategoryName] === undefined) {
          continue;
        }

        let pluginsForCategory =
          this.#pluginsByHookCategory.get(hookCategoryName);

        if (pluginsForCategory === undefined) {
          pluginsForCategory = [];
          this.#pluginsByHookCategory.set(hookCategoryName, pluginsForCategory);
        }

        pluginsForCategory.push(plugin);
      }
    }
  }

  public setContext(context: HookContext): void {
    this.#context = context;
  }

  public registerHandlers<HookCategoryNameT extends keyof HardhatHooks>(
    hookCategoryName: HookCategoryNameT,
    hookHandlerCategory: Partial<HardhatHooks[HookCategoryNameT]>,
  ): void {
    let categories = this.#dynamicHookHandlerCategories.get(hookCategoryName);
    if (categories === undefined) {
      categories = [];
      this.#dynamicHookHandlerCategories.set(hookCategoryName, categories);
    }

    categories.unshift(hookHandlerCategory);

    this.#invalidateResolvedHandlersCache(hookCategoryName);
  }

  public unregisterHandlers<HookCategoryNameT extends keyof HardhatHooks>(
    hookCategoryName: HookCategoryNameT,
    hookHandlerCategory: Partial<HardhatHooks[HookCategoryNameT]>,
  ): void {
    const categories = this.#dynamicHookHandlerCategories.get(hookCategoryName);
    if (categories === undefined) {
      return;
    }

    this.#dynamicHookHandlerCategories.set(
      hookCategoryName,
      categories.filter((c) => c !== hookHandlerCategory),
    );

    this.#invalidateResolvedHandlersCache(hookCategoryName);
  }

  public async runHandlerChain<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends ChainedHook<HardhatHooks[HookCategoryNameT][HookNameT]>,
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    params: InitialChainedHookParams<HookCategoryNameT, HookT>,
    defaultImplementation: LastParameter<HookT>,
  ): Promise<Awaited<Return<HardhatHooks[HookCategoryNameT][HookNameT]>>> {
    // Synchronous fast path for already cached handlers. This duplicates
    // the check inside #getHandlersInChainedRunningOrder on purpose:
    // calling that async method introduces a microtask tick even on a
    // cache hit, whereas a direct Map lookup stays on the current tick.
    // That tick matters here because runHandlerChain is on every hook's
    // hot path, and this path pairs with the empty-handlers shortcut
    // below to dispatch straight to defaultImplementation with no awaits.
    const cachedHandlers = this.#chainedHandlers
      .get(hookCategoryName)
      ?.get(hookName as string);

    const handlers =
      cachedHandlers ??
      (await this.#getHandlersInChainedRunningOrder(
        hookCategoryName,
        hookName,
      ));

    let handlerParams: Parameters<typeof defaultImplementation>;
    if (hookCategoryName !== "config") {
      assertHardhatInvariant(
        this.#context !== undefined,
        "Context must be set before running non-config hooks",
      );

      handlerParams = [this.#context, ...params] as any;
    } else {
      handlerParams = params as any;
    }

    // Fast path for the common case of no registered handlers: skip building
    // handlerParams and the `next` closure, and call the default implementation
    // directly.
    if (handlers.length === 0) {
      return (await defaultImplementation(...handlerParams)) as any;
    }

    const numberOfHandlers = handlers.length;
    let index = 0;
    const next = async (...nextParams: typeof handlerParams) => {
      const result =
        index < numberOfHandlers
          ? await (handlers[index++] as any)(...nextParams, next)
          : await defaultImplementation(...nextParams);

      return result;
    };

    return await next(...handlerParams);
  }

  public async runSequentialHandlers<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends HardhatHooks[HookCategoryNameT][HookNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    params: InitialHookParams<HookCategoryNameT, HookT>,
  ): Promise<
    Array<Awaited<Return<HardhatHooks[HookCategoryNameT][HookNameT]>>>
  > {
    const handlers = await this.#getHandlersInSequentialRunningOrder(
      hookCategoryName,
      hookName,
    );

    let handlerParams: any;
    if (hookCategoryName !== "config") {
      assertHardhatInvariant(
        this.#context !== undefined,
        "Context must be set before running non-config hooks",
      );

      handlerParams = [this.#context, ...params];
    } else {
      handlerParams = params;
    }

    const result = [];
    for (const handler of handlers) {
      result.push(await (handler as any)(...handlerParams));
    }

    return result;
  }

  public async runParallelHandlers<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
    HookT extends HardhatHooks[HookCategoryNameT][HookNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
    params: InitialHookParams<HookCategoryNameT, HookT>,
  ): Promise<
    Array<Awaited<Return<HardhatHooks[HookCategoryNameT][HookNameT]>>>
  > {
    // The ordering of handlers is unimportant here, as they are run in parallel
    const handlers = await this.#getHandlersInChainedRunningOrder(
      hookCategoryName,
      hookName,
    );

    let handlerParams: any;
    if (hookCategoryName !== "config") {
      assertHardhatInvariant(
        this.#context !== undefined,
        "Context must be set before running non-config hooks",
      );

      handlerParams = [this.#context, ...params];
    } else {
      handlerParams = params;
    }

    return await Promise.all(
      handlers.map((handler) => (handler as any)(...handlerParams)),
    );
  }

  public async hasHandlers<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<boolean> {
    // The ordering of handlers is unimportant here, as we only check if any exist
    const handlers = await this.#getHandlersInChainedRunningOrder(
      hookCategoryName,
      hookName,
    );

    return handlers.length > 0;
  }

  async #getHandlersInChainedRunningOrder<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<Array<HardhatHooks[HookCategoryNameT][HookNameT]>> {
    let handlersByName = this.#chainedHandlers.get(hookCategoryName);
    if (handlersByName === undefined) {
      handlersByName = new Map();
      this.#chainedHandlers.set(hookCategoryName, handlersByName);
    }

    const cached = handlersByName.get(hookName as string);
    if (cached !== undefined) {
      return cached;
    }

    const staticCategories =
      await this.#getStaticHookHandlerCategories(hookCategoryName);

    // IMPORTANT NOTE: Accessing the dynamic hook handlers MUST happen
    // after awaiting the static ones. See
    // #invalidateResolvedHandlersCache for more info.
    const dynamicCategories = this.#dynamicHookHandlerCategories.get(
      hookCategoryName,
    ) as Array<Partial<HardhatHooks[HookCategoryNameT]>> | undefined;

    const handlers: Array<HardhatHooks[HookCategoryNameT][HookNameT]> = [];

    if (dynamicCategories !== undefined) {
      for (const category of dynamicCategories) {
        const handler = category[hookName];
        if (handler !== undefined) {
          handlers.push(handler as HardhatHooks[HookCategoryNameT][HookNameT]);
        }
      }
    }

    for (const category of staticCategories) {
      const handler = category[hookName];
      if (handler !== undefined) {
        handlers.push(handler as HardhatHooks[HookCategoryNameT][HookNameT]);
      }
    }

    handlersByName.set(hookName as string, handlers);

    return handlers;
  }

  async #getHandlersInSequentialRunningOrder<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<Array<HardhatHooks[HookCategoryNameT][HookNameT]>> {
    let handlersByName = this.#sequentialHandlers.get(hookCategoryName);
    if (handlersByName === undefined) {
      handlersByName = new Map();
      this.#sequentialHandlers.set(hookCategoryName, handlersByName);
    }

    const cached = handlersByName.get(hookName as string);
    if (cached !== undefined) {
      return cached;
    }

    const chained = await this.#getHandlersInChainedRunningOrder(
      hookCategoryName,
      hookName,
    );

    const sequential = chained.toReversed();

    handlersByName.set(hookName as string, sequential);

    return sequential;
  }

  async #getStaticHookHandlerCategories<
    HookCategoryNameT extends keyof HardhatHooks,
  >(
    hookCategoryName: HookCategoryNameT,
  ): Promise<Array<Partial<HardhatHooks[HookCategoryNameT]>>> {
    const cached = this.#resolvedStaticCategories.get(hookCategoryName) as
      | Array<Partial<HardhatHooks[HookCategoryNameT]>>
      | undefined;

    if (cached !== undefined) {
      return cached;
    }

    const plugins = this.#pluginsByHookCategory.get(hookCategoryName);

    // We don't need to get the mutex to resolve this case, as it will always
    // be an empty array, and won't execute any factory.
    if (plugins === undefined) {
      this.#resolvedStaticCategories.set(hookCategoryName, []);
      return [];
    }

    return await this.#mutex.exclusiveRun(async () => {
      // Re-check under the mutex in case another caller just populated it.
      const recheck = this.#resolvedStaticCategories.get(hookCategoryName) as
        | Array<Partial<HardhatHooks[HookCategoryNameT]>>
        | undefined;

      if (recheck !== undefined) {
        return recheck;
      }

      const resolved = await Promise.all(
        plugins.map(
          async (plugin) =>
            await this.#getPluginStaticHookCategory(plugin, hookCategoryName),
        ),
      );

      this.#resolvedStaticCategories.set(hookCategoryName, resolved);

      return resolved;
    });
  }

  /**
   * Returns the hook category object for a plugin that has the hook category
   * defined.
   *
   * @param plugin A plugin that MUST have the given hook category defined.
   * @param hookCategoryName The name of the hook category.
   * @returns The hook category object.
   */
  async #getPluginStaticHookCategory<
    HookCategoryNameT extends keyof HardhatHooks,
  >(
    plugin: HardhatPlugin,
    hookCategoryName: HookCategoryNameT,
  ): Promise<Partial<HardhatHooks[HookCategoryNameT]>> {
    const hookHandlerCategoryFactory = plugin.hookHandlers?.[hookCategoryName];

    assertHardhatInvariant(
      hookHandlerCategoryFactory !== undefined,
      "#pluginsByHookCategory only contains plugins with this hook category",
    );

    let factory;
    try {
      factory = (await hookHandlerCategoryFactory()).default;
    } catch (error) {
      ensureError(error);

      await detectPluginNpmDependencyProblems(this.#projectRoot, plugin, error);

      throw new HardhatError(
        HardhatError.ERRORS.CORE.HOOKS.FAILED_TO_LOAD_HOOK_HANDLER_FACTORY,
        { pluginId: plugin.id, hookCategoryName },
        error,
      );
    }

    assertHardhatInvariant(
      typeof factory === "function",
      `Plugin ${plugin.id} doesn't export a hook factory for category ${hookCategoryName}`,
    );

    let hookCategory: Partial<HardhatHooks[HookCategoryNameT]>;
    try {
      hookCategory = await factory();
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.CORE.HOOKS.FAILED_TO_RUN_HOOK_HANDLER_FACTORY,
        { pluginId: plugin.id, hookCategoryName },
        error,
      );
    }

    assertHardhatInvariant(
      hookCategory !== null && typeof hookCategory === "object",
      `Plugin ${plugin.id} doesn't export a valid factory for category ${hookCategoryName}, it didn't return an object`,
    );

    return hookCategory;
  }

  #invalidateResolvedHandlersCache<
    HookCategoryNameT extends keyof HardhatHooks,
  >(hookCategoryName: HookCategoryNameT) {
    // Invalidation deletes the outer entry rather than clearing the inner
    // map. This matters under concurrency.
    //
    // A reader of #getHandlersInChainedRunningOrder (or its sequential
    // sibling) captures a reference to the inner map before awaiting the
    // static categories, and writes its computed array back after the
    // await. If invalidation runs during that await, deleting the outer
    // entry leaves the reader's inner map orphaned: its write lands in a
    // map no longer reachable from #chainedHandlers/#sequentialHandlers,
    // so it cannot poison the shared cache. The next reader sees
    // `undefined`, installs a fresh inner map, and rebuilds from the
    // current dynamic state.
    //
    // Two distinct properties make this safe, guaranteed by two different
    // things:
    //
    //   1. The in-flight reader's own return value is correct. This is
    //      because #getHandlersInChainedRunningOrder reads
    //      #dynamicHookHandlerCategories *after* awaiting the static
    //      categories. Any invalidation that happened during the await is
    //      visible to the reader when it resumes, so the array it builds
    //      reflects the current dynamic state.
    //
    //   2. The shared cache never holds a stale array. This is guaranteed
    //      by the orphaning-by-delete described above: a reader that
    //      started before the invalidation can only write into an
    //      unreachable inner map.
    //
    // Property 1 depends on the ordering of the dynamic handlers read relative
    // to the await. If that read ever moved *before* the await, a reader
    // could build a stale array and return it to its caller — the cache
    // would still be protected by property 2, but the reader's caller
    // would see the stale result.
    this.#chainedHandlers.delete(hookCategoryName);
    this.#sequentialHandlers.delete(hookCategoryName);
  }
}
