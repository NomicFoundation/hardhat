"use strict";

const findUp = require("find-up");
const path = require("path");
const fs = require("fs-extra");

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

async function getRecommendedGitIgnore() {
  const gitIgnorePath = path.join(
    __dirname,
    "..",
    "..",
    "recommended-gitignore.txt"
  );

  return fs.readFile(gitIgnorePath, "utf-8");
}

module.exports = {
  isCwdInsideProject,
  getUserConfigPath,
  getProjectRoot,
  getRecommendedGitIgnore
};
