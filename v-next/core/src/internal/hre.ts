import type { UnsafeHardhatRuntimeEnvironmentOptions } from "../types/cli.js";
import type { HardhatUserConfig, HardhatConfig } from "../types/config.js";
import type {
  GlobalOptions,
  GlobalOptionsMap,
} from "../types/global-options.js";
import type {
  HardhatUserConfigValidationError,
  HookContext,
  HookManager,
} from "../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../types/hre.js";
import type { HardhatPlugin } from "../types/plugins.js";
import type { TaskManager } from "../types/tasks.js";
import type { UserInterruptionManager } from "../types/user-interruptions.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ResolvedConfigurationVariableImplementation } from "./configuration-variables.js";
import {
  buildGlobalOptionsMap,
  resolveGlobalOptions,
} from "./global-options.js";
import { HookManagerImplementation } from "./hook-manager.js";
import { resolvePluginList } from "./plugins/resolve-plugin-list.js";
import { TaskManagerImplementation } from "./tasks/task-manager.js";
import { UserInterruptionManagerImplementation } from "./user-interruptions.js";

export class HardhatRuntimeEnvironmentImplementation
  implements HardhatRuntimeEnvironment
{
  public static async create(
    inputUserConfig: HardhatUserConfig,
    userProvidedGlobalOptions: Partial<GlobalOptions>,
    unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
  ): Promise<HardhatRuntimeEnvironmentImplementation> {
    // TODO: Clone with lodash or https://github.com/davidmarkclements/rfdc
    // TODO: Or maybe don't clone at all
    const clonedUserConfig = inputUserConfig;

    // Resolve plugins from node modules relative to the current working directory
    const basePathForNpmResolution = process.cwd();

    const resolvedPlugins =
      unsafeOptions?.resolvedPlugins ??
      (await resolvePluginList(
        clonedUserConfig.plugins,
        basePathForNpmResolution,
      ));

    const hooks = new HookManagerImplementation(resolvedPlugins);

    // extend user config:
    const extendedUserConfig = await runUserConfigExtensions(
      hooks,
      clonedUserConfig,
    );

    // validate config
    const userConfigValidationErrors = await validateUserConfig(
      hooks,
      extendedUserConfig,
    );

    if (userConfigValidationErrors.length > 0) {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG, {
        errors: `\t${userConfigValidationErrors
          .map(
            (error) =>
              `* Config error in .${error.path.join(".")}: ${error.message}`,
          )
          .join("\n\t")}`,
      });
    }

    // Resolve config

    const resolvedConfig = await resolveUserConfig(
      hooks,
      resolvedPlugins,
      inputUserConfig,
    );

    // We override the plugins, as we want to prevent plugins from changing this
    const config = {
      ...resolvedConfig,
      plugins: resolvedPlugins,
    };

    const globalOptionsMap =
      unsafeOptions?.globalOptionsMap ?? buildGlobalOptionsMap(resolvedPlugins);

    const globalOptions = resolveGlobalOptions(
      userProvidedGlobalOptions,
      globalOptionsMap,
    );

    // Set the HookContext in the hook manager so that non-config hooks can
    // use it

    const interruptions = new UserInterruptionManagerImplementation(hooks);

    const hookContext: HookContext = {
      hooks,
      config,
      globalOptions,
      interruptions,
    };

    hooks.setContext(hookContext);

    const hre = new HardhatRuntimeEnvironmentImplementation(
      extendedUserConfig,
      config,
      hooks,
      interruptions,
      globalOptions,
      globalOptionsMap,
    );

    await hooks.runSequentialHandlers("hre", "created", [hre]);

    return hre;
  }

  public readonly tasks: TaskManager;

  private constructor(
    public readonly userConfig: HardhatUserConfig,
    public readonly config: HardhatConfig,
    public readonly hooks: HookManager,
    public readonly interruptions: UserInterruptionManager,
    public readonly globalOptions: GlobalOptions,
    globalOptionsMap: GlobalOptionsMap,
  ) {
    this.tasks = new TaskManagerImplementation(this, globalOptionsMap);
  }
}

async function runUserConfigExtensions(
  hooks: HookManager,
  config: HardhatUserConfig,
): Promise<HardhatUserConfig> {
  return hooks.runHandlerChain(
    "config",
    "extendUserConfig",
    [config],
    async (c) => {
      return c;
    },
  );
}

async function validateUserConfig(
  hooks: HookManager,
  config: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  // TODO: Validate the plugin and tasks lists
  const validationErrors: HardhatUserConfigValidationError[] = [];

  const results = await hooks.runParallelHandlers(
    "config",
    "validateUserConfig",
    [config],
  );

  return [...validationErrors, ...results.flat(1)];
}

async function resolveUserConfig(
  hooks: HookManager,
  sortedPlugins: HardhatPlugin[],
  config: HardhatUserConfig,
): Promise<HardhatConfig> {
  const initialResolvedConfig: HardhatConfig = {
    plugins: sortedPlugins,
    tasks: config.tasks ?? [],
  };

  return hooks.runHandlerChain(
    "config",
    "resolveUserConfig",
    [
      config,
      (variable) =>
        new ResolvedConfigurationVariableImplementation(hooks, variable),
    ],
    async (_, __) => {
      return initialResolvedConfig;
    },
  );
}
