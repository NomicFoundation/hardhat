import chalk from "chalk";
import fsExtra from "fs-extra";
import path from "path";
import type StackTraceParserT from "stacktrace-parser";

import { HardhatArguments, HardhatConfig } from "../../../types";
import { HardhatContext } from "../../context";
import { findClosestPackageJson } from "../../util/packageInfo";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";
import { getUserConfigPath } from "../project-structure";

import { resolveConfig } from "./config-resolution";
import { validateConfig } from "./config-validation";
import { DEFAULT_SOLC_VERSION } from "./default-config";

function importCsjOrEsModule(filePath: string): any {
  const imported = require(filePath);
  return imported.default !== undefined ? imported.default : imported;
}

export function resolveConfigPath(configPath: string | undefined) {
  if (configPath === undefined) {
    configPath = getUserConfigPath();
  } else {
    if (!path.isAbsolute(configPath)) {
      configPath = path.join(process.cwd(), configPath);
      configPath = path.normalize(configPath);
    }
  }
  return configPath;
}

export function loadConfigAndTasks(
  hardhatArguments?: Partial<HardhatArguments>,
  { showWarningIfNoSolidityConfig } = { showWarningIfNoSolidityConfig: true }
): HardhatConfig {
  let configPath =
    hardhatArguments !== undefined ? hardhatArguments.config : undefined;

  configPath = resolveConfigPath(configPath);

  // Before loading the builtin tasks, the default and user's config we expose
  // the config env in the global object.
  const configEnv = require("./config-env");

  const globalAsAny: any = global;

  Object.entries(configEnv).forEach(
    ([key, value]) => (globalAsAny[key] = value)
  );

  const ctx = HardhatContext.getHardhatContext();

  ctx.setConfigLoadingAsStarted();

  let userConfig;

  try {
    require("../tasks/builtin-tasks");
    userConfig = importCsjOrEsModule(configPath);
  } catch (e) {
    analyzeModuleNotFoundError(e, configPath);

    // tslint:disable-next-line only-hardhat-error
    throw e;
  } finally {
    ctx.setConfigLoadingAsFinished();
  }

  validateConfig(userConfig);

  if (userConfig.solidity === undefined && showWarningIfNoSolidityConfig) {
    console.warn(
      chalk.yellow(
        `Solidity compiler is not configured. Version ${DEFAULT_SOLC_VERSION} will be used by default. Add a 'solidity' entry to your configuration to supress this warning.

Learn more about compiler configuration at https://hardhat.org/config"
`
      )
    );
  }

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach((key) => (globalAsAny[key] = undefined));

  const frozenUserConfig = deepFreezeUserConfig(userConfig);

  const resolved = resolveConfig(configPath, userConfig);

  for (const extender of HardhatContext.getHardhatContext().configExtenders) {
    extender(resolved, frozenUserConfig);
  }

  return resolved;
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

/**
 * Receives an Error and checks if it's a MODULE_NOT_FOUND and the reason that
 * caused it.
 *
 * If it can infer the reason, it throws an appropiate error. Otherwise it does
 * nothing.
 */
export function analyzeModuleNotFoundError(error: any, configPath: string) {
  const stackTraceParser = require("stacktrace-parser") as typeof StackTraceParserT;

  if (error.code !== "MODULE_NOT_FOUND") {
    return;
  }
  const stackTrace = stackTraceParser.parse(error.stack);
  const throwingFile = stackTrace
    .filter((x) => x.file !== null)
    .map((x) => x.file!)
    .find((x) => path.isAbsolute(x));

  if (throwingFile === null || throwingFile === undefined) {
    return;
  }

  // if the error comes from the config file, we ignore it because we know it's
  // a direct import that's missing
  if (throwingFile === configPath) {
    return;
  }

  const packageJsonPath = findClosestPackageJson(throwingFile);

  if (packageJsonPath === null) {
    return;
  }

  const packageJson = fsExtra.readJsonSync(packageJsonPath);
  const peerDependencies: { [name: string]: string } =
    packageJson.peerDependencies ?? {};

  if (peerDependencies["@nomiclabs/buidler"] !== undefined) {
    throw new HardhatError(ERRORS.PLUGINS.BUIDLER_PLUGIN, {
      plugin: packageJson.name,
    });
  }

  // if the problem doesn't come from a hardhat plugin, we ignore it
  if (peerDependencies.hardhat === undefined) {
    return;
  }

  const missingPeerDependencies: { [name: string]: string } = {};
  for (const [peerDependency, version] of Object.entries(peerDependencies)) {
    const peerDependencyPackageJson = readPackageJson(peerDependency);
    if (peerDependencyPackageJson === undefined) {
      missingPeerDependencies[peerDependency] = version;
    }
  }

  const missingPeerDependenciesNames = Object.keys(missingPeerDependencies);
  if (missingPeerDependenciesNames.length > 0) {
    throw new HardhatError(ERRORS.PLUGINS.MISSING_DEPENDENCIES, {
      plugin: packageJson.name,
      missingDependencies: missingPeerDependenciesNames.join(", "),
      missingDependenciesVersions: Object.entries(missingPeerDependencies)
        .map(([name, version]) => `"${name}@${version}"`)
        .join(" "),
    });
  }
}

interface PackageJson {
  name: string;
  version: string;
  peerDependencies?: {
    [name: string]: string;
  };
}

function readPackageJson(packageName: string): PackageJson | undefined {
  try {
    const packageJsonPath = require.resolve(
      path.join(packageName, "package.json")
    );

    return require(packageJsonPath);
  } catch (error) {
    return undefined;
  }
}
