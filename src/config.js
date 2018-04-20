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

  global.internalTask = internalTask;
  global.task = task;
  global.run = run;
  global.Web3 = Web3;

  require("./builtin-tasks");

  const userConfig = require(pathToConfigFile);

  // merge with default config
  const config = {
    root: path.dirname(pathToConfigFile),
    ...require("./default-config"),
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
