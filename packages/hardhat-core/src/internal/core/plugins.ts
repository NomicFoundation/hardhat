import debug from "debug";
import * as path from "path";

import { HardhatContext } from "../context";

import { HardhatError } from "./errors";
import { ERRORS } from "./errors-list";
import { ExecutionMode, getExecutionMode } from "./execution-mode";

const log = debug("hardhat:core:plugins");

interface PackageJson {
  name: string;
  version: string;
  peerDependencies?: {
    [name: string]: string;
  };
}

/**
 * Validates a plugin dependencies and loads it.
 * @param pluginName - The plugin name
 * @param hardhatContext - The HardhatContext
 * @param from - Where to resolve plugins and dependencies from. Only for
 * testing purposes.
 */
export function usePlugin(
  hardhatContext: HardhatContext,
  pluginName: string,
  from?: string
) {
  log("Loading plugin %s", pluginName);

  const executionMode = getExecutionMode();

  if (from === undefined) {
    // We have two different ways to search for plugins.
    //
    // If Hardhat is installed globally, we want to force the plugins to also be
    // installed globally, otherwise we can end up in a very chaotic situation.
    // The way we enforce this is by setting `from` to something inside Hardhat
    // itself, as it will be placed in the global node_modules.
    //
    // If Hardhat is not installed globally, we want the plugins to be
    // accessible from the project's root, not from the Hardhat installation.
    // The reason for this is that yarn workspaces can easily hoist Hardhat and
    // not the plugins, leaving you with something like this:
    //
    //    root/
    //      node_modules/
    //        hardhat
    //      subpackage1/
    //        node_modules/
    //          plugin@v1/
    //        hardhat.config.js
    //      subpackage2/
    //        node_modules/
    //          plugin@v2/
    //        hardhat.config.js
    //
    // If we were to load the plugins from the Hardhat installation in this
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
      from = hardhatContext.getConfigPath();
    }
  }

  if (hardhatContext.loadedPlugins.includes(pluginName)) {
    return;
  }

  const pluginPackageJson = readPackageJson(pluginName, from);
  if (
    pluginPackageJson?.peerDependencies?.["@nomiclabs/buidler"] !== undefined
  ) {
    throw new HardhatError(ERRORS.PLUGINS.BUIDLER_PLUGIN, {
      plugin: pluginName,
    });
  }

  const options = from !== undefined ? { paths: [from] } : undefined;
  const pluginPath = require.resolve(pluginName, options);
  loadPluginFile(pluginPath);

  hardhatContext.setPluginAsLoaded(pluginName);
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
