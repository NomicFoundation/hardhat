const findUp = require("find-up");
const path = require("path");

const { task, run } = require("./tasks");

function getUserConfigPath() {
  const pathToConfigFile = findUp.sync("sool-config.js");
  if (!pathToConfigFile) {
    throw new Error("You are not in a valid project");
  }

  return pathToConfigFile;
}

function getConfig() {
  const pathToConfigFile = getUserConfigPath();

  global.task = task;
  global.run = run;

  require("./builtin-tasks");

  const userConfig = require(pathToConfigFile);

  // merge with default config
  const config = {
    root: path.dirname(pathToConfigFile),
    solc: {
      version: "0.4.20"
    },
    ...userConfig
  };

  return config;
}

module.exports = { getUserConfigPath, getConfig };
