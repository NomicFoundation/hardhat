import deepmerge from "deepmerge";

import { BuidlerConfig, NetworkConfig } from "../../types";
import { BuidlerError, ERRORS } from "../errors";
import { getUserConfigPath } from "../project-structure";

function importCsjOrEsModule(path: string): any {
  const imported = require(path);
  return imported.default !== undefined ? imported.default : imported;
}

function mergeConfig(defaultConfig: any, userConfig: any): BuidlerConfig {
  const config: BuidlerConfig = deepmerge(defaultConfig, userConfig, {
    arrayMerge: (destination: any[], source: any[]) => source
  });

  return config;
}

export function getConfig() {
  const pathToConfigFile = getUserConfigPath();

  // Before loading the builtin tasks, the default and user's config we expose
  // the config env in the global object.
  const configEnv = require("./config-env");

  const globalAsAny: any = global;

  Object.entries(configEnv).forEach(
    ([key, value]) => (globalAsAny[key] = value)
  );

  require("../tasks/builtin-tasks");

  const defaultConfig = importCsjOrEsModule("./default-config");
  const userConfig = importCsjOrEsModule(pathToConfigFile);

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach(key => (globalAsAny[key] = undefined));

  const config = mergeConfig(defaultConfig, userConfig);

  const dsl = require("./tasks-dsl-instance").default;

  return [config, dsl.getTaskDefinitions()];
}

export function getNetworkConfig(
  config: BuidlerConfig,
  selectedNetwork: string
): NetworkConfig {
  if (
    config.networks === undefined ||
    config.networks[selectedNetwork] === undefined
  ) {
    throw new BuidlerError(ERRORS.NETWORK_CONFIG_NOT_FOUND, selectedNetwork);
  }

  return config.networks[selectedNetwork];
}
