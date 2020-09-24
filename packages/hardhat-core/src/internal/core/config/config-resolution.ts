import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";

import {
  AnalyticsConfig,
  HardhatConfig,
  MultiSolcConfig,
  ProjectPaths,
  ResolvedHardhatConfig,
  SolcConfig,
  SolidityConfig,
} from "../../../types/config";
import { ConfigExtender } from "../../../types/plugins";
import { fromEntries } from "../../util/lang";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";
import { normalizeHardhatNetworkAccountsConfig } from "../providers/util";

function mergeUserAndDefaultConfigs(
  defaultConfig: HardhatConfig,
  userConfig: HardhatConfig
): Partial<HardhatConfig> {
  return deepmerge(defaultConfig, userConfig, {
    arrayMerge: (destination: any[], source: any[]) => deepmerge([], source), // this "unproxies" the arrays
    customMerge: (key) => {
      if (key === "solidity") {
        return (defaultValue, userValue) => {
          return userValue === undefined
            ? defaultValue
            : deepmerge({}, userValue);
        };
      }
      return deepmerge;
    },
  }) as any;
}

function normalizeSolidityConfig(
  solidityConfig: SolidityConfig
): MultiSolcConfig {
  if (typeof solidityConfig === "string") {
    return {
      compilers: [
        {
          version: solidityConfig,
        },
      ],
    };
  }

  if ("version" in solidityConfig) {
    return { compilers: [solidityConfig] };
  }

  return solidityConfig;
}

/**
 * This functions resolves the hardhat config by merging the user provided config
 * and the hardhat default config.
 *
 * @param userConfigPath the user config filepath
 * @param defaultConfig  the hardhat's default config object
 * @param userConfig     the user config object
 * @param configExtenders An array of ConfigExtenders
 *
 * @returns the resolved config
 */
export function resolveConfig(
  userConfigPath: string,
  defaultConfig: HardhatConfig,
  userConfig: HardhatConfig,
  configExtenders: ConfigExtender[]
): ResolvedHardhatConfig {
  userConfig = deepFreezeUserConfig(userConfig);

  const config = mergeUserAndDefaultConfigs(defaultConfig, userConfig);

  const paths = resolveProjectPaths(userConfigPath, userConfig.paths);

  const resolved = {
    ...config,
    paths,
    solidity: normalizeSolidityConfig(config.solidity!),
    networks: {
      ...config.networks!,
      hardhat: {
        ...config.networks!.hardhat,
        accounts: normalizeHardhatNetworkAccountsConfig(
          config.networks!.hardhat.accounts!
        ),
      },
    },
    defaultNetwork: config.defaultNetwork!,
    analytics: config.analytics! as Required<AnalyticsConfig>,
  };

  for (const extender of configExtenders) {
    extender(resolved, userConfig);
  }

  return resolved;
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
    tests: resolvePathFrom(root, "test", userPaths.tests),
  };
}

function deepFreezeUserConfig(
  config: any,
  propertyPath: Array<string | number | symbol> = []
) {
  if (typeof config !== "object" || config === null) {
    return config;
  }

  return new Proxy(config, {
    get(target: any, property: string | number | symbol, receiver: any): any {
      return deepFreezeUserConfig(Reflect.get(target, property, receiver), [
        ...propertyPath,
        property,
      ]);
    },

    set(
      target: any,
      property: string | number | symbol,
      value: any,
      receiver: any
    ): boolean {
      throw new HardhatError(ERRORS.GENERAL.USER_CONFIG_MODIFIED, {
        path: [...propertyPath, property]
          .map((pathPart) => pathPart.toString())
          .join("."),
      });
    },
  });
}
