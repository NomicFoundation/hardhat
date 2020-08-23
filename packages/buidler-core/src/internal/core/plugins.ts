import debug from "debug";
import * as path from "path";
import * as semver from "semver";

import { BuidlerContext } from "../context";

import { BuidlerError } from "./errors";
import { ERRORS } from "./errors-list";
import { ExecutionMode, getExecutionMode } from "./execution-mode";

const log = debug("buidler:core:plugins");

interface PackageJson {
  name: string;
  version: string;
  peerDependencies: {
    [name: string]: string;
  };
}

/**
 * Validates a plugin dependencies and loads it.
 * @param pluginName - The plugin name
 * @param buidlerContext - The BuidlerContext
 * @param from - Where to resolve plugins and dependencies from. Only for
 * testing purposes.
 */
export function usePlugin(
  buidlerContext: BuidlerContext,
  pluginName: string,
  from?: string
) {
  log("Loading plugin %s", pluginName);

  const executionMode = getExecutionMode();

  if (from === undefined) {
    // We have two different ways to search for plugins.
    //
    // If Buidler is installed globally, we want to force the plugins to also be
    // installed globally, otherwise we can end up in a very chaotic situation.
    // The way we enforce this is by setting `from` to something inside Buidler
    // itself, as it will be placed in the global node_modules.
    //
    // If Buidler is not installed globally, we want the plugins to be
    // accessible from the project's root, not from the Buidler installation.
    // The reason for this is that yarn workspaces can easily hoist Buidler and
    // not the plugins, leaving you with something like this:
    //
    //    root/
    //      node_modules/
    //        buidler
    //      subpackage1/
    //        node_modules/
    //          plugin@v1/
    //        buidler.config.js
    //      subpackage2/
    //        node_modules/
    //          plugin@v2/
    //        buidler.config.js
    //
    // If we were to load the plugins from the Buidler installation in this
    // situation, they wouldn't be found. Instead, we should load them from the
    // project's root.
    //
    // To make things slightly more complicated, we don't really know the
    // project's root, as we are still loading the config. What we do know
    // though, is the config file's path, which must be inside the project, so
    // we use that instead.
    if (executionMode === ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION) {
      from = __dirname;
    } else {
      from = buidlerContext.getConfigPath();
    }
  }

  let globalFlag = "";
  let globalWarning = "";
  if (executionMode === ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION) {
    globalFlag = " --global";
    globalWarning =
      "You are using a global installation of Buidler. Plugins and their dependencies must also be global.\n";
  }

  const pluginPackageJson = readPackageJson(pluginName, from);

  if (pluginPackageJson === undefined) {
    const installExtraFlags = globalFlag;

    throw new BuidlerError(ERRORS.PLUGINS.NOT_INSTALLED, {
      plugin: pluginName,
      extraMessage: globalWarning,
      extraFlags: installExtraFlags,
    });
  }

  // We use the package.json's version of the name, as it is normalized.
  pluginName = pluginPackageJson.name;

  if (buidlerContext.loadedPlugins.includes(pluginName)) {
    return;
  }

  if (pluginPackageJson.peerDependencies !== undefined) {
    for (const [dependencyName, versionSpec] of Object.entries(
      pluginPackageJson.peerDependencies
    )) {
      const dependencyPackageJson = readPackageJson(dependencyName, from);

      let installExtraFlags = globalFlag;

      if (versionSpec.match(/^[0-9]/) !== null) {
        installExtraFlags += " --save-exact";
      }

      if (dependencyPackageJson === undefined) {
        throw new BuidlerError(ERRORS.PLUGINS.MISSING_DEPENDENCY, {
          plugin: pluginName,
          dependency: dependencyName,
          extraMessage: globalWarning,
          extraFlags: installExtraFlags,
          versionSpec,
        });
      }

      const installedVersion = dependencyPackageJson.version;

      if (
        !semver.satisfies(installedVersion, versionSpec, {
          includePrerelease: true,
        })
      ) {
        throw new BuidlerError(ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH, {
          plugin: pluginName,
          dependency: dependencyName,
          extraMessage: globalWarning,
          extraFlags: installExtraFlags,
          versionSpec,
          installedVersion,
        });
      }
    }
  }

  const options = from !== undefined ? { paths: [from] } : undefined;
  const pluginPath = require.resolve(pluginName, options);
  loadPluginFile(pluginPath);

  buidlerContext.setPluginAsLoaded(pluginName);
}

export function loadPluginFile(absolutePluginFilePath: string) {
  log("Loading plugin file %s", absolutePluginFilePath);
  const imported = require(absolutePluginFilePath);
  const plugin = imported.default !== undefined ? imported.default : imported;
  if (typeof plugin === "function") {
    plugin();
  }
}

export function readPackageJson(
  packageName: string,
  from?: string
): PackageJson | undefined {
  try {
    const options = from !== undefined ? { paths: [from] } : undefined;
    const packageJsonPath = require.resolve(
      path.join(packageName, "package.json"),
      options
    );

    return require(packageJsonPath);
  } catch (error) {
    return undefined;
  }
}

export function ensurePluginLoadedWithUsePlugin() {
  // No-op. Only here for backwards compatibility
}
