"use strict";

const importLazy = require("import-lazy")(require);
const findUp = require("find-up");
const path = require("path");
const fs = importLazy("fs-extra");

const { ERRORS, BuidlerError } = require("./errors");

const CONFIG_FILENAME = "buidler-config.js";

function isCwdInsideProject() {
  return !!findUp.sync(CONFIG_FILENAME);
}

function getUserConfigPath() {
  const pathToConfigFile = findUp.sync(CONFIG_FILENAME);
  if (!pathToConfigFile) {
    throw new BuidlerError(ERRORS.BUIDLER_NOT_INSIDE_PROJECT);
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

async function getRecommendedBabelRc() {
  const babelRcPath = path.join(
    __dirname,
    "..",
    "..",
    "recommended-babelrc.txt"
  );

  return fs.readFile(babelRcPath, "utf-8");
}

module.exports = {
  isCwdInsideProject,
  getUserConfigPath,
  getProjectRoot,
  getRecommendedGitIgnore,
  getRecommendedBabelRc,
};
