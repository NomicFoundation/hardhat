import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";

import {
  BuidlerConfig,
  HttpNetworkConfig,
  Networks,
  ProjectPaths,
  ResolvedBuidlerConfig
} from "../../types";

export function resolveNetworks(networks: Networks) {
  if (
    networks.auto !== undefined &&
    Object.keys(networks.auto).includes("url")
  ) {
    delete (networks.auto as any).url;
  }

  for (const name of Object.keys(networks)) {
    if (name === "auto") {
      continue;
    }

    const network = networks[name] as HttpNetworkConfig;
    if (network.url === undefined) {
      network.url = "http://localhost:8545";
    }

    if (
      network.accounts === undefined ||
      Object.keys(network.accounts).length === 0
    ) {
      network.accounts = "remote";
    }
  }
}

function mergeUserAndDefaultConfigs(
  defaultConfig: BuidlerConfig,
  userConfig: BuidlerConfig
) {
  return deepmerge(defaultConfig, userConfig, {
    arrayMerge: (destination: any[], source: any[]) => source
  });
}

export function resolveConfig(
  userConfigPath: string,
  defaultConfig: BuidlerConfig,
  userConfig: BuidlerConfig
): ResolvedBuidlerConfig {
  const config: ResolvedBuidlerConfig = mergeUserAndDefaultConfigs(
    defaultConfig,
    userConfig
  );

  config.paths = resolveProjectPaths(userConfigPath, userConfig.paths);
  resolveNetworks(config.networks);

  return config;
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

  const otherPaths = Object.assign(
    {},
    ...Object.entries<string>(userPaths).map(([name, value]) => ({
      [name]: resolvePathFrom(root, value)
    }))
  );

  return {
    ...otherPaths,
    root,
    configFile,
    sources: resolvePathFrom(root, "contracts", userPaths.sources),
    cache: resolvePathFrom(root, "cache", userPaths.cache),
    artifacts: resolvePathFrom(root, "artifacts", userPaths.artifacts)
  };
}
