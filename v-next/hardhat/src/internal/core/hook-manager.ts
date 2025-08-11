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
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";

import { AsyncMutex } from "./async-mutex.js";
import { detectPluginNpmDependencyProblems } from "./plugins/detect-plugin-npm-dependency-problems.js";

export class HookManagerImplementation implements HookManager {
  readonly #mutex: AsyncMutex = new AsyncMutex();

  readonly #projectRoot: string;

  readonly #pluginsInReverseOrder: HardhatPlugin[];

  /**
   * Initially `undefined` to be able to run the config hooks during
   * initialization.
   */
  #context: HookContext | undefined;

  /**
   * The initialized handler categories for each plugin.
   */
  readonly #staticHookHandlerCategories: Map<
    string,
    Map<keyof HardhatHooks, Partial<HardhatHooks[keyof HardhatHooks]>>
  > = new Map();

  /**
   * A map of the dynamically registered handler categories.
   *
   * Each array is a list of categories, in reverse order of registration.
   */
  readonly #dynamicHookHandlerCategories: Map<
    keyof HardhatHooks,
    Array<Partial<HardhatHooks[keyof HardhatHooks]>>
  > = new Map();

  constructor(projectRoot: string, plugins: HardhatPlugin[]) {
    this.#projectRoot = projectRoot;
    this.#pluginsInReverseOrder = plugins.toReversed();
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
    const handlers = await this.#getHandlersInChainedRunningOrder(
      hookCategoryName,
      hookName,
    );

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

    const numberOfHandlers = handlers.length;
    let index = 0;
    const next = async (...nextParams: typeof handlerParams) => {
      const result =
        index < numberOfHandlers
          ? await (handlers[index++] as any)(...nextParams, next)
          : await defaultImplementation(...nextParams);

      return result;
    };

    return next(...handlerParams);
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

    return Promise.all(
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
    const pluginHooks = await this.#getPluginHooks(hookCategoryName, hookName);

    const dynamicHooks = await this.#getDynamicHooks(
      hookCategoryName,
      hookName,
    );

    return [...dynamicHooks, ...pluginHooks];
  }

  async #getHandlersInSequentialRunningOrder<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<Array<HardhatHooks[HookCategoryNameT][HookNameT]>> {
    const handlersInChainedOrder = await this.#getHandlersInChainedRunningOrder(
      hookCategoryName,
      hookName,
    );

    return handlersInChainedOrder.reverse();
  }

  async #getDynamicHooks<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<Array<HardhatHooks[HookCategoryNameT][HookNameT]>> {
    const categories = this.#dynamicHookHandlerCategories.get(
      hookCategoryName,
    ) as Array<Partial<HardhatHooks[HookCategoryNameT]>> | undefined;

    if (categories === undefined) {
      return [];
    }

    return categories.flatMap((hookCategory) => {
      return (hookCategory[hookName] ?? []) as Array<
        HardhatHooks[HookCategoryNameT][HookNameT]
      >;
    });
  }

  async #getPluginHooks<
    HookCategoryNameT extends keyof HardhatHooks,
    HookNameT extends keyof HardhatHooks[HookCategoryNameT],
  >(
    hookCategoryName: HookCategoryNameT,
    hookName: HookNameT,
  ): Promise<Array<HardhatHooks[HookCategoryNameT][HookNameT]>> {
    const categories: Array<
      Partial<HardhatHooks[HookCategoryNameT]> | undefined
    > = await this.#mutex.exclusiveRun(async () => {
      return Promise.all(
        this.#pluginsInReverseOrder.map(async (plugin) => {
          const existingCategory = this.#staticHookHandlerCategories
            .get(plugin.id)
            ?.get(hookCategoryName);

          if (existingCategory !== undefined) {
            return existingCategory as Partial<HardhatHooks[HookCategoryNameT]>;
          }

          const hookHandlerCategoryFactory =
            plugin.hookHandlers?.[hookCategoryName];

          if (hookHandlerCategoryFactory === undefined) {
            return;
          }

          const factory = (await hookHandlerCategoryFactory()).default;
          const hookCategory = await factory();

          if (!this.#staticHookHandlerCategories.has(plugin.id)) {
            this.#staticHookHandlerCategories.set(plugin.id, new Map());
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Defined right above
          this.#staticHookHandlerCategories
            .get(plugin.id)!
            .set(hookCategoryName, hookCategory);

          return hookCategory;
        }),
      );
    });

    return categories.flatMap((category) => {
      const handler = category?.[hookName];
      if (handler === undefined) {
        return [];
      }

      return handler as HardhatHooks[HookCategoryNameT][HookNameT];
    });
  }

  async #loadHookCategoryFactory<HookCategoryNameT extends keyof HardhatHooks>(
    plugin: HardhatPlugin,
    hookCategoryName: HookCategoryNameT,
    path: string,
  ): Promise<Partial<HardhatHooks[HookCategoryNameT]>> {
    if (!path.startsWith("file://")) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.HOOKS.INVALID_HOOK_FACTORY_PATH,
        {
          pluginId: plugin.id,
          hookCategoryName,
          path,
        },
      );
    }

    let mod;

    try {
      mod = await import(path);
    } catch (error) {
      await detectPluginNpmDependencyProblems(this.#projectRoot, plugin);
      throw error;
    }

    const factory = mod.default;

    assertHardhatInvariant(
      typeof factory === "function",
      `Plugin ${plugin.id} doesn't export a hook factory for category ${hookCategoryName} in ${path}`,
    );

    const category = await factory();

    assertHardhatInvariant(
      category !== null && typeof category === "object",
      `Plugin ${plugin.id} doesn't export a valid factory for category ${hookCategoryName} in ${path}, it didn't return an object`,
    );

    return category;
  }
}
