import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";

import {
  BuidlerConfig,
  ProjectPaths,
  ResolvedBuidlerConfig
} from "../../../types";
import { fromEntries } from "../../util/lang";

function mergeUserAndDefaultConfigs(
  defaultConfig: BuidlerConfig,
  userConfig: BuidlerConfig
): Partial<ResolvedBuidlerConfig> {
  return deepmerge(defaultConfig, userConfig, {
    arrayMerge: (destination: any[], source: any[]) => source
  }) as any;
}

/**
 * This functions resolves the buidler config by merging the user provided config
 * and the buidler default config.
 *
 * @param userConfigPath the user config filepath
 * @param defaultConfig  the buidler's default config object
 * @param userConfig     the user config object
 *
 * @returns the resolved config
 */
export function resolveConfig(
  userConfigPath: string,
  defaultConfig: BuidlerConfig,
  userConfig: BuidlerConfig
): ResolvedBuidlerConfig {
  const config = mergeUserAndDefaultConfigs(defaultConfig, userConfig);

  const paths = resolveProjectPaths(userConfigPath, userConfig.paths);

  return {
    ...config,
    paths,
    networks: config.networks!,
    solc: config.solc!
  };
}

function resolvePathFrom(
  from: string,
  defaultPath: string,
  relativeOrAbsolutePath: string = defaultPath
) {
  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath;
  }

  return path.join(from, relativeOrAbsolutePath);
}

/**
 * This function resolves the ProjectPaths object from the user-provided config
 * and its path. The logic of this is not obvious and should well be document.
 * The good thing is that most users will never use this.
 *
 * Explanation:
 *    - paths.configFile is not overridable
 *    - If a path is absolute it is used "as is".
 *    - If the root path is relative, it's resolved from paths.configFile's dir.
 *    - If any other path is relative, it's resolved from paths.root.
 */
export function resolveProjectPaths(
  userConfigPath: string,
  userPaths: any = {}
): ProjectPaths {
  const configFile = fs.realpathSync(userConfigPath);
  const configDir = path.dirname(configFile);

  const root = resolvePathFrom(configDir, "", userPaths.root);

  const otherPathsEntries = Object.entries<string>(userPaths).map<
    [string, string]
  >(([name, value]) => [name, resolvePathFrom(root, value)]);

  const otherPaths = fromEntries(otherPathsEntries);

  return {
    ...otherPaths,
    root,
    configFile,
    sources: resolvePathFrom(root, "contracts", userPaths.sources),
    cache: resolvePathFrom(root, "cache", userPaths.cache),
    artifacts: resolvePathFrom(root, "artifacts", userPaths.artifacts),
    tests: resolvePathFrom(root, "test", userPaths.tests)
  };
}
