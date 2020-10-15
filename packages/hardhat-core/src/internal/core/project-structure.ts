import findUp from "find-up";
import fsExtra from "fs-extra";
import path from "path";

import { getPackageRoot } from "../util/packageInfo";

import { HardhatError } from "./errors";
import { ERRORS } from "./errors-list";
const JS_CONFIG_FILENAME = "hardhat.config.js";
const TS_CONFIG_FILENAME = "hardhat.config.ts";

export function isCwdInsideProject() {
  return (
    findUp.sync(TS_CONFIG_FILENAME) !== null ||
    findUp.sync(JS_CONFIG_FILENAME) !== null
  );
}

export function getUserConfigPath() {
  const tsConfigPath = findUp.sync(TS_CONFIG_FILENAME);
  if (tsConfigPath !== null) {
    return tsConfigPath;
  }

  const pathToConfigFile = findUp.sync(JS_CONFIG_FILENAME);
  if (pathToConfigFile === null) {
    throw new HardhatError(ERRORS.GENERAL.NOT_INSIDE_PROJECT);
  }

  return pathToConfigFile;
}

export async function getRecommendedGitIgnore() {
  const packageRoot = getPackageRoot();
  const gitIgnorePath = path.join(packageRoot, "recommended-gitignore.txt");

  return fsExtra.readFile(gitIgnorePath, "utf-8");
}
