import type { UnsafeHardhatRuntimeEnvironmentOptions } from "../types/cli.js";
import type { HardhatUserConfig, HardhatConfig } from "../types/config.js";
import type {
  GlobalOptions,
  GlobalOptionDefinitions,
} from "../types/global-options.js";
import type { HookContext, HookManager } from "../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../types/hre.js";
import type { HardhatPlugin } from "../types/plugins.js";
import type { TaskManager } from "../types/tasks.js";
import type { UserInterruptionManager } from "../types/user-interruptions.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { findClosestPackageRoot } from "@ignored/hardhat-vnext-utils/package";

import { validateUserConfig } from "./config-validation.js";
import { ResolvedConfigurationVariableImplementation } from "./configuration-variables.js";
import {
  buildGlobalOptionDefinitions,
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
    projectRoot?: string,
    unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
  ): Promise<HardhatRuntimeEnvironmentImplementation> {
    const resolvedProjectRoot = await resolveProjectRoot(projectRoot);

    const resolvedPlugins =
      unsafeOptions?.resolvedPlugins ??
      (await resolvePluginList(resolvedProjectRoot, inputUserConfig.plugins));

    const hooks = new HookManagerImplementation(
      resolvedProjectRoot,
      resolvedPlugins,
    );

    // extend user config:
    const extendedUserConfig = await runUserConfigExtensions(
      hooks,
      inputUserConfig,
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
              `* Config error in config.${error.path.join(".")}: ${error.message}`,
          )
          .join("\n\t")}`,
      });
    }

    // Resolve config

    const resolvedConfig = await resolveUserConfig(
      resolvedProjectRoot,
      hooks,
      resolvedPlugins,
      inputUserConfig,
    );

    // We override the plugins and the proejct root, as we want to prevent
    // the plugins from changing them
    const config: HardhatConfig = {
      ...resolvedConfig,
      paths: {
        ...resolvedConfig.paths,
        root: resolvedProjectRoot,
      },
      plugins: resolvedPlugins,
    };

    const globalOptionDefinitions =
      unsafeOptions?.globalOptionDefinitions ??
      buildGlobalOptionDefinitions(resolvedPlugins);

    const globalOptions = resolveGlobalOptions(
      userProvidedGlobalOptions,
      globalOptionDefinitions,
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
      globalOptionDefinitions,
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
    globalOptionDefinitions: GlobalOptionDefinitions,
  ) {
    this.tasks = new TaskManagerImplementation(this, globalOptionDefinitions);
  }
}

/**
 * Resolves the project root of a Hardhat project based on the config file or
 * another path within the project. If not provided, it will be resolved from
 * the current working directory.
 *
 * @param absolutePathWithinProject An absolute path within the project, usually
 * the config file.
 */
export async function resolveProjectRoot(
  absolutePathWithinProject: string | undefined,
): Promise<string> {
  return findClosestPackageRoot(absolutePathWithinProject ?? process.cwd());
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

async function resolveUserConfig(
  projectRoot: string,
  hooks: HookManager,
  sortedPlugins: HardhatPlugin[],
  config: HardhatUserConfig,
): Promise<HardhatConfig> {
  const initialResolvedConfig: HardhatConfig = {
    plugins: sortedPlugins,
    tasks: config.tasks ?? [],
    paths: {
      root: projectRoot,
      cache: config.paths?.cache ?? "", // TODO: resolve cache path
      artifacts: config.paths?.artifacts ?? "", // TODO: resolve artifacts path
      tests: config.paths?.tests ?? "test", // TODO: resolve tests path
    },
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
