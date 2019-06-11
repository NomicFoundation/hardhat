import * as path from "path";
import * as semver from "semver";

import { BuidlerContext } from "../context";
import { getClosestCallerPackage } from "../util/caller-package";

import { BuidlerError, ERRORS } from "./errors";
import { ExecutionMode, getExecutionMode } from "./execution-mode";

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
  // We have a special case for `ExecutionMode.EXECUTION_MODE_LINKED`
  //
  // If Buidler is linked, a require without `from` would be executed in the
  // context of Buidler, and not find any plugin (linked or not). We workaround
  // this by using the CWD here.
  //
  // This is not ideal, but the only reason to link Buidler is testing.
  if (
    from === undefined &&
    getExecutionMode() === ExecutionMode.EXECUTION_MODE_LINKED
  ) {
    from = process.cwd();
  }

  const pluginPackageJson = readPackageJson(pluginName, from);

  if (pluginPackageJson === undefined) {
    throw new BuidlerError(ERRORS.PLUGINS.NOT_INSTALLED, pluginName);
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

      if (dependencyPackageJson === undefined) {
        throw new BuidlerError(
          ERRORS.PLUGINS.MISSING_DEPENDENCY,
          pluginName,
          dependencyName,
          dependencyName,
          versionSpec
        );
      }

      const installedVersion = dependencyPackageJson.version;

      if (!semver.satisfies(installedVersion, versionSpec)) {
        throw new BuidlerError(
          ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH,
          pluginName,
          dependencyName,
          versionSpec,
          installedVersion,
          dependencyName,
          dependencyName,
          versionSpec,
          dependencyName
        );
      }
    }
  }

  const options = from !== undefined ? { paths: [from] } : undefined;
  const pluginPath = require.resolve(pluginName, options);
  loadPluginFile(pluginPath);

  buidlerContext.setPluginAsLoaded(pluginName);
}

export function loadPluginFile(absolutePluginFilePath: string) {
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
  const previousPrepareStackTrace = Error.prepareStackTrace;

  Error.prepareStackTrace = (e, s) => s;

  const error = new Error();
  const stack: NodeJS.CallSite[] = error.stack as any;

  Error.prepareStackTrace = previousPrepareStackTrace;

  for (const callSite of stack) {
    const fileName = callSite.getFileName();
    if (fileName === null) {
      continue;
    }

    const functionName = callSite.getFunctionName();

    if (
      path.basename(fileName) === path.basename(__filename) &&
      functionName === loadPluginFile.name
    ) {
      return;
    }
  }

  const pluginName = getClosestCallerPackage();

  throw new BuidlerError(
    ERRORS.PLUGINS.OLD_STYLE_IMPORT_DETECTED,
    pluginName !== undefined ? pluginName : "a plugin",
    pluginName !== undefined ? pluginName : "plugin-name"
  );
}
