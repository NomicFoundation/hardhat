import * as path from "path";
import * as semver from "semver";

import { getClosestCallerPackage } from "../util/caller-package";

import { BuidlerError, ERRORS } from "./errors";

interface PackageJson {
  version: string;
  peerDependencies: {
    [name: string]: string;
  };
}

/**
 * Validates a plugin dependencies and loads it.
 * @param pluginName - The plugin name
 * @param from - Where to resolve plugins and dependencies from. Only for
 * testing purposes.
 */
export function usePlugin(pluginName: string, from?: string) {
  const pluginPackageJson = readPackageJson(pluginName, from);

  if (pluginPackageJson === undefined) {
    throw new BuidlerError(ERRORS.PLUGINS.NOT_INSTALLED, pluginName);
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
