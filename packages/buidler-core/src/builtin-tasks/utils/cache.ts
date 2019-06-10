import fsExtra from "fs-extra";
import path from "path";

import { glob } from "../../internal/util/glob";
import { ProjectPaths } from "../../types";

// Matches the earliest date of modification for compiled files against the latest date for source files (including libraries).
// A special case if the Buidler config used, as it can be changed (select another config file through a buidler option), or the same file can be modified.
export const areArtifactsCached = async (
  sourceGlobalPaths: string[],
  paths: ProjectPaths
): Promise<boolean> => {
  const configDate = await getConfigModificationDate(
    paths.cache,
    paths.configFile
  );

  if (configDate === undefined) {
    // tslint:disable-next-line: no-floating-promises
    saveLastConfigUsed(paths);
    return false;
  }

  const maxSourceDate = await getMaxSourceDate(sourceGlobalPaths);
  const minArtifactDate = await getMinArtifactDate(paths.artifacts);

  return maxSourceDate < minArtifactDate && configDate < minArtifactDate;
};

async function getModificationDatesInDir(dir: string): Promise<number[]> {
  const pattern = path.join(dir, "**", "*");
  const files = await glob(pattern);

  return Promise.all(
    files.map(async file => (await fsExtra.stat(file)).mtimeMs)
  );
}

const getMaxSourceDate = (sourceGlobalPaths: string[]) =>
  Promise.all(
    sourceGlobalPaths.map(globalPath =>
      fsExtra.stat(globalPath).then(fileStat => fileStat.mtimeMs)
    )
  ).then(timestamps => Math.max(...timestamps));

const getMinArtifactDate = (artifactsPath: string) => {
  return getModificationDatesInDir(artifactsPath).then(timestamps =>
    Math.min(...timestamps)
  );
};

const LAST_CONFIG_USED_FILENAME = "path-to-last-config-used.txt";

async function getConfigModificationDate(
  cachePath: string,
  currentConfigPath: string
): Promise<number | undefined> {
  const lastConfigPath: string | undefined = await getLastUsedConfig(cachePath);

  if (currentConfigPath === lastConfigPath) {
    const stat = await fsExtra.stat(currentConfigPath);

    return stat.mtimeMs;
  }
  return undefined;
}

function getPathToCachedLastConfigPath(cachePath: string) {
  const pathToLastConfigUsed = path.join(cachePath, LAST_CONFIG_USED_FILENAME);

  return pathToLastConfigUsed;
}

async function getLastUsedConfig(
  cachePath: string
): Promise<string | undefined> {
  const pathToLastConfigUsed = getPathToCachedLastConfigPath(cachePath);

  if (!(await fsExtra.pathExists(pathToLastConfigUsed))) {
    return undefined;
  }

  return fsExtra.readFile(pathToLastConfigUsed, "utf-8");
}

async function saveLastConfigUsed(paths: ProjectPaths) {
  const pathToLastConfigUsed = getPathToCachedLastConfigPath(paths.cache);

  await fsExtra.ensureDir(path.dirname(pathToLastConfigUsed));

  return fsExtra.writeFile(pathToLastConfigUsed, paths.configFile, "utf-8");
}
