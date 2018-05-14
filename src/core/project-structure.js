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

async function isInsideGitRepository(projectRoot) {
  const options = {};
  if (projectRoot !== undefined) {
    options.cwd = projectRoot;
  }

  return !!(await findUp(".git", options));
}

module.exports = {
  isCwdInsideProject,
  getUserConfigPath,
  getProjectRoot,
  isInsideGitRepository
};
