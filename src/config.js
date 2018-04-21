const findUp = require("find-up");
const path = require("path");
const Web3 = require("web3");

const { getSoolArguments } = require("./arguments");
const { task, internalTask, run } = require("./tasks");

function getUserConfigPath() {
  const pathToConfigFile = findUp.sync("sool-config.js");
  if (!pathToConfigFile) {
    throw new Error("You are not in a valid project");
  }

  return pathToConfigFile;
}

function getConfig() {
  const pathToConfigFile = getUserConfigPath();

  // Before loading the builtin tasks, the default and user's config we expose
  // the tasks' DSL and Web3 though the global object.
  const exported = { internalTask, task, run, Web3 };
  Object.entries(exported).forEach(([key, value]) => (global[key] = value));

  require("./builtin-tasks");

  const userConfig = require(pathToConfigFile);
  const defaultConfig = require("./default-config");

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(exported).forEach(key => (global[key] = undefined));

  const projectRoot = path.dirname(pathToConfigFile);

  const config = {
    paths: {
      root: projectRoot,
      cache: path.join(projectRoot, "cache"),
      artifacts: path.join(projectRoot, "artifacts")
    },
    ...defaultConfig,
    ...userConfig
  };

  config.selectedNetwork = getNetworkConfig(config, getSelectedNetworkName());

  return config;
}

function getSelectedNetworkName() {
  const args = getSoolArguments();
  return args.network || "development";
}

function getNetworkConfig(config, selectedNetwork) {
  if (
    config.networks === undefined ||
    config.networks[selectedNetwork] === undefined
  ) {
    throw new Error(`Network ${selectedNetwork} not defined.`);
  }

  return config.networks[selectedNetwork];
}

module.exports = { getConfig };
