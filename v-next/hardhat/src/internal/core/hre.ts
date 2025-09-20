import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./types.js";
import type { ArtifactManager } from "../../types/artifacts.js";
import type {
  HardhatUserConfig,
  HardhatConfig,
  ProjectPathsUserConfig,
  ProjectPathsConfig,
  TestPathsConfig,
  SourcePathsConfig,
} from "../../types/config.js";
import type {
  GlobalOptions,
  GlobalOptionDefinitions,
} from "../../types/global-options.js";
import type {
  HardhatUserConfigValidationError,
  HookContext,
  HookManager,
} from "../../types/hooks.js";
import type {
  HardhatRuntimeEnvironment,
  HardhatRuntimeEnvironmentVersions,
} from "../../types/hre.js";
import type { NetworkManager } from "../../types/network.js";
import type { HardhatPlugin } from "../../types/plugins.js";
import type { SolidityBuildSystem } from "../../types/solidity/build-system.js";
import type { TaskManager } from "../../types/tasks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";
import type { CoverageManager } from "../builtin-plugins/coverage/types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { findClosestPackageRoot } from "@nomicfoundation/hardhat-utils/package";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

import { getEdrVersion, getHardhatVersion } from "../utils/package.js";

import { validateUserConfig } from "./config-validation.js";
import { resolveConfigurationVariable } from "./configuration-variables.js";
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
  // NOTE: This is a small architectural violation, as these shouldn't be needed
  // here, because they are added by plugins. But as those plugins are builtin,
  // their type extensions also affect this module.
  public network!: NetworkManager;
  public artifacts!: ArtifactManager;
  public solidity!: SolidityBuildSystem;

  // NOTE: This is slight architectural violation, as this is intended for the
  // internal use only. It is set up by the coverage plugin in the `created` hook.
  public _coverage!: CoverageManager;

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

    const [hardhatVersion, edrVersion] = await Promise.all([
      getHardhatVersion(),
      getEdrVersion(),
    ]);

    const versions: HardhatRuntimeEnvironmentVersions = {
      hardhat: hardhatVersion,
      edr: edrVersion,
    };
    const hooks = new HookManagerImplementation(
      resolvedProjectRoot,
      resolvedPlugins,
    );

    const configResolutionResult = await resolveUserConfigToHardhatConfig(
      inputUserConfig,
      hooks,
      resolvedProjectRoot,
      userProvidedGlobalOptions.config,
      resolvedPlugins,
    );

    if (!configResolutionResult.success) {
      throw new HardhatError(HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG, {
        errors: `\t${configResolutionResult.userConfigValidationErrors
          .map(
            (error) =>
              `* Config error in config.${error.path.join(".")}: ${error.message}`,
          )
          .join("\n\t")}`,
      });
    }

    const { config, extendedUserConfig } = configResolutionResult;

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

    const hre = new HardhatRuntimeEnvironmentImplementation(
      extendedUserConfig,
      config,
      hooks,
      interruptions,
      globalOptions,
      versions,
      globalOptionDefinitions,
    );

    // We create an object with the HRE as its prototype, and overwrite the
    // tasks property with undefined, so that hooks don't have access to the
    // task runner.
    //
    // The reason we do this with a prototype instead of a shallow copy is that
    // the handlers hooked into hre/created may assign new properties to the
    // HRE and we want those to be accessible to all the handlers.
    const hookContext: HookContext = Object.create(hre, {
      tasks: { value: undefined },
    });

    hooks.setContext(hookContext);

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
    public readonly versions: HardhatRuntimeEnvironmentVersions,
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

/**
 * Runs the provided Hardhat user config through the resolution process,
 * invoking relevant plugin hooks (both internal and external) to extend
 * and transform the config into a full HardhatConfig.
 *
 * @param hooks - The HookManager used to run config extension and validation
 * hooks.
 * @param inputUserConfig - The initial user provided Hardhat config object.
 * @param resolvedProjectRoot - The project root path.
 * @param userProvidedConfigPath - The user provided Hardhat config file path.
 * @param resolvedPlugins - The list of plugins, we do not want the plugins
 * overwriting them so we re-add them to the final HardhatConfig.
 * @returns Either an object containing the resolved HardhatConfig and the
 * extended version of the user config, or a list of validation errors.
 */
export async function resolveUserConfigToHardhatConfig(
  inputUserConfig: HardhatUserConfig,
  hooks: HookManager,
  resolvedProjectRoot: string,
  userProvidedConfigPath: string | undefined,
  resolvedPlugins: HardhatPlugin[],
): Promise<
  | {
      success: true;
      config: HardhatConfig;
      extendedUserConfig: HardhatUserConfig;
    }
  | {
      success: false;
      userConfigValidationErrors: HardhatUserConfigValidationError[];
    }
> {
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
    return {
      success: false,
      userConfigValidationErrors,
    };
  }

  // Resolve config
  const resolvedConfig = await resolveUserConfig(
    resolvedProjectRoot,
    userProvidedConfigPath,
    hooks,
    resolvedPlugins,
    extendedUserConfig,
  );

  // We override the plugins and the project root, as we want to prevent
  // the plugins from changing them
  const config: HardhatConfig = {
    ...resolvedConfig,
    paths: {
      ...resolvedConfig.paths,
      root: resolvedProjectRoot,
    },
    plugins: resolvedPlugins,
  };

  return { success: true, config, extendedUserConfig };
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
  configPath: string | undefined,
  hooks: HookManager,
  sortedPlugins: HardhatPlugin[],
  config: HardhatUserConfig,
): Promise<HardhatConfig> {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  The config resolution is type-unsafe, as plugins augment the HardhatConfig
  type. This means that: (1) we can't fully initialize a valid HardhatConfig
  here, and (2) when writing a hook handler, the value returned by next() is
  probably invalid with respect to your own augmentations. */
  const initialResolvedConfig = {
    plugins: sortedPlugins,
    tasks: config.tasks ?? [],
    paths: resolvePaths(projectRoot, configPath, config.paths),
  } as HardhatConfig;

  return hooks.runHandlerChain(
    "config",
    "resolveUserConfig",
    [config, (variable) => resolveConfigurationVariable(hooks, variable)],
    async (_, __) => {
      return initialResolvedConfig;
    },
  );
}

function resolvePaths(
  projectRoot: string,
  configPath: string | undefined,
  userProvidedPaths: ProjectPathsUserConfig = {},
): ProjectPathsConfig {
  return {
    root: projectRoot,
    config:
      configPath !== undefined
        ? resolveFromRoot(projectRoot, configPath)
        : undefined,
    cache: resolveFromRoot(projectRoot, userProvidedPaths.cache ?? "cache"),
    artifacts: resolveFromRoot(
      projectRoot,
      userProvidedPaths.artifacts ?? "artifacts",
    ),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We cast as the builtin plugins' type extensions are also applied here,
    making an empty object incompatible, but it's the correct value when you
    ignore the plugins. */
    tests: {} as TestPathsConfig,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    See the comment in tests. */
    sources: {} as SourcePathsConfig,
  };
}
