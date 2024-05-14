import type { HardhatRuntimeEnvironment } from "../types/hre.js";
import { HardhatUserConfig, HardhatConfig } from "../types/config.js";
import {
  HardhatUserConfigValidationError,
  HookContext,
  HookManager,
} from "../types/hooks.js";
import { HardhatPlugin } from "../types/plugins.js";
import { UserInterruptionManager } from "../types/user-interruptions.js";

import { HookManagerImplementation } from "./hook-manager.js";
import builtinFunctionality from "./builtin-functionality.js";
import { reverseTopologicalSort } from "./plugins/sort.js";
import { UserInterruptionManagerImplementation } from "./user-interruptions.js";
import { ResolvedConfigurationVariableImplementation } from "./config/configuration-variables.js";

export class HardhatRuntimeEnvironmentImplementation
  implements HardhatRuntimeEnvironment
{
  public static async create(
    inputUserConfig: HardhatUserConfig,
  ): Promise<HardhatRuntimeEnvironmentImplementation> {
    // TODO: Clone with lodash or https://github.com/davidmarkclements/rfdc
    const clonedUserConfig = inputUserConfig;

    // Topological sort of plugins
    const sortedPlugins = reverseTopologicalSort([
      // global argumetns plugin
      // build system plugin
      // networks plugin
      // task runner plugin
      builtinFunctionality,
      ...(clonedUserConfig.plugins ?? []),
    ]);

    const hooks = new HookManagerImplementation(sortedPlugins);

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
      sortedPlugins,
      inputUserConfig,
    );

    // We override the plugins, as we want to prevent plugins from changing this
    const config = {
      ...resolvedConfig,
      plugins: sortedPlugins,
    };

    // Set the HookContext in the hook manager so that non-config hooks can
    // use it

    const interruptions = new UserInterruptionManagerImplementation(hooks);

    const hookContext: HookContext = {
      hooks,
      config,
      interruptions,
    };

    hooks.setContext(hookContext);

    const hre = new HardhatRuntimeEnvironmentImplementation(
      extendedUserConfig,
      config,
      hooks,
      interruptions,
    );

    await hooks.runSequentialHandlers("hre", "created", [hre]);

    return hre;
  }

  private constructor(
    public readonly userConfig: HardhatUserConfig,
    public readonly config: HardhatConfig,
    public readonly hooks: HookManager,
    public readonly interruptions: UserInterruptionManager,
  ) {}
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
  const results = await hooks.runParallelHandlers(
    "config",
    "validateUserConfig",
    [config],
  );

  return results.flat(1);
}

async function resolveUserConfig(
  hooks: HookManager,
  sortedPlugins: HardhatPlugin[],
  config: HardhatUserConfig,
): Promise<HardhatConfig> {
  const initialResolvedConfig = {
    plugins: sortedPlugins,
  } as HardhatConfig;

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
