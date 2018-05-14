"use strict";

const findUp = require("find-up");
const path = require("path");

const CONFIG_FILENAME = "buidler-config.js";

function isCwdInsideProject() {
  return !!findUp.sync(CONFIG_FILENAME);
}

function getUserConfigPath() {
  const pathToConfigFile = findUp.sync(CONFIG_FILENAME);
  if (!pathToConfigFile) {
    throw new Error("You are not in a valid project");
  }

  return pathToConfigFile;
}

function getProjectRoot() {
  return path.dirname(getUserConfigPath());
}

module.exports = { isCwdInsideProject, getUserConfigPath, getProjectRoot };
