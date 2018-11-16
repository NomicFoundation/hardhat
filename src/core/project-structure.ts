import { getPackageRoot } from "../util/packageInfo";

const importLazy = require("import-lazy")(require);
const findUp = require("find-up");
const path = require("path");
const fs = importLazy("fs-extra");

const { ERRORS, BuidlerError } = require("./errors");

const CONFIG_FILENAME = "buidler-config.js";

export function isCwdInsideProject() {
  return !!findUp.sync(CONFIG_FILENAME);
}

export function getUserConfigPath() {
  const pathToConfigFile = findUp.sync(CONFIG_FILENAME);
  if (!pathToConfigFile) {
    throw new BuidlerError(ERRORS.BUIDLER_NOT_INSIDE_PROJECT);
  }

  return pathToConfigFile;
}

export function getProjectRoot() {
  return path.dirname(getUserConfigPath());
}

export async function getRecommendedGitIgnore() {
  const packageRoot = await getPackageRoot();
  const gitIgnorePath = path.join(packageRoot, "recommended-gitignore.txt");

  return fs.readFile(gitIgnorePath, "utf-8");
}
