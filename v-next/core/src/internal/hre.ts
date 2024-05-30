import type { HardhatRuntimeEnvironment } from "../types/hre.js";

import { UnsafeHardhatRuntimeEnvironmentOptions } from "../types/cli.js";
import { HardhatUserConfig, HardhatConfig } from "../types/config.js";
import {
  GlobalArguments,
  GlobalParameterMap,
} from "../types/global-parameters.js";
import {
  HardhatUserConfigValidationError,
  HookContext,
  HookManager,
} from "../types/hooks.js";
import { HardhatPlugin } from "../types/plugins.js";
import { TaskManager } from "../types/tasks.js";
import { UserInterruptionManager } from "../types/user-interruptions.js";

import { ResolvedConfigurationVariableImplementation } from "./configuration-variables.js";
import {
  buildGlobalParameterMap,
  resolveGlobalArguments,
} from "./global-parameters.js";
import { HookManagerImplementation } from "./hook-manager.js";
import { resolvePluginList } from "./plugins/resolve-plugin-list.js";
import { TaskManagerImplementation } from "./tasks/task-manager.js";
import { UserInterruptionManagerImplementation } from "./user-interruptions.js";

export class HardhatRuntimeEnvironmentImplementation
  implements HardhatRuntimeEnvironment
{
  public static async create(
    inputUserConfig: HardhatUserConfig,
    userProvidedGlobalArguments: Partial<GlobalArguments>,
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
      throw new Error(
        `Invalid config:\n\t${userConfigValidationErrors
          .map(
            (error) =>
              `* Config error in .${error.path.join(".")}: ${error.message}`,
          )
          .join("\n\t")}`,
      );
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

    const globalParametersIndex =
      unsafeOptions?.globalParameterMap ??
      buildGlobalParameterMap(resolvedPlugins);

    const globalArguments = resolveGlobalArguments(
      userProvidedGlobalArguments,
      globalParametersIndex,
    );

    // Set the HookContext in the hook manager so that non-config hooks can
    // use it

    const interruptions = new UserInterruptionManagerImplementation(hooks);

    const hookContext: HookContext = {
      hooks,
      config,
      globalArguments,
      interruptions,
    };

    hooks.setContext(hookContext);

    const hre = new HardhatRuntimeEnvironmentImplementation(
      extendedUserConfig,
      config,
      hooks,
      interruptions,
      globalArguments,
      globalParametersIndex,
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
    public readonly globalArguments: GlobalArguments,
    globalParametersIndex: GlobalParameterMap,
  ) {
    this.tasks = new TaskManagerImplementation(this, globalParametersIndex);
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
