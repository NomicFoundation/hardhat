const importLazy = require("import-lazy")(require);
const Web3 = importLazy("web3");
const deepmerge = require("deepmerge");

const { getUserConfigPath } = require("./project-structure");
const types = require("./types");
const { task, internalTask } = require("./tasks/dsl");
const { extendEnvironment } = require("./env/extensions");
const { ERRORS, BuidlerError } = require("./errors");

export function getConfig() {
  const pathToConfigFile = getUserConfigPath();

  // Before loading the builtin tasks, the default and user's config we expose
  // the tasks' DSL and Web3 though the global object.
  const exported = { internalTask, task, Web3, types, extendEnvironment };
  Object.entries(exported).forEach(([key, value]) => (global[key] = value));

  require("./tasks/builtin-tasks");

  const defaultConfig = require("./default-config");
  const userConfig = require(pathToConfigFile);

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(exported).forEach(key => (global[key] = undefined));

  const config = deepmerge(defaultConfig, userConfig, {
    arrayMerge: (destination, source) => source
  });

  return config;
}

export function getNetworkConfig(config, selectedNetwork) {
  if (
    config.networks === undefined ||
    config.networks[selectedNetwork] === undefined
  ) {
    throw new BuidlerError(ERRORS.NETWORK_CONFIG_NOT_FOUND, selectedNetwork);
  }

  return config.networks[selectedNetwork];
}
