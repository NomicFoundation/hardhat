import findUp from "find-up";
import path from "path";

import { getPackageRoot } from "../util/packageInfo";

import { BuidlerError, ERRORS } from "./errors";

const CONFIG_FILENAME = "buidler.config.js";

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

export async function getRecommendedGitIgnore() {
  const fsExtra = await import("fs-extra");
  const packageRoot = await getPackageRoot();
  const gitIgnorePath = path.join(packageRoot, "recommended-gitignore.txt");

  return fsExtra.readFile(gitIgnorePath, "utf-8");
}
