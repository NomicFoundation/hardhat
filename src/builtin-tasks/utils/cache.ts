import path from "path";

import { ProjectPaths } from "../../types";
import { glob } from "../../internal/util/glob";

const LAST_CONFIG_USED_FILENAME = "path-to-last-config-used.txt";

async function getModificationDate(file: string): Promise<Date> {
  const fsExtra = await import("fs-extra");
  const stat = await fsExtra.stat(file);
  return new Date(stat.mtime);
}

async function getConfigModificationDate(configPath: string): Promise<Date> {
  return getModificationDate(configPath);
}

async function getModificationDatesInDir(dir: string): Promise<Date[]> {
  const pattern = path.join(dir, "**");
  const files = await glob(pattern);
  const promises: Array<Promise<Date>> = files.map(getModificationDate);
  return Promise.all(promises);
}

async function getLastModificationDateInDir(dir: string) {
  const dates = await getModificationDatesInDir(dir);

  if (dates.length === 0) {
    return undefined;
  }

  return dates.reduce((d1, d2) => (d1.getTime() > d2.getTime() ? d1 : d2));
}

function getPathToCachedLastConfigPath(paths: ProjectPaths) {
  const pathToLastConfigUsed = path.join(
    paths.cache,
    LAST_CONFIG_USED_FILENAME
  );

  return pathToLastConfigUsed;
}

async function getLastUsedConfig(
  paths: ProjectPaths
): Promise<string | undefined> {
  const fsExtra = await import("fs-extra");
  const pathToLastConfigUsed = getPathToCachedLastConfigPath(paths);

  if (!(await fsExtra.pathExists(pathToLastConfigUsed))) {
    return undefined;
  }

  return fsExtra.readFile(pathToLastConfigUsed, "utf-8");
}

async function saveLastConfigUsed(paths: ProjectPaths) {
  const fsExtra = await import("fs-extra");
  const pathToLastConfigUsed = getPathToCachedLastConfigPath(paths);

  await fsExtra.ensureDir(path.dirname(pathToLastConfigUsed));

  return fsExtra.writeFile(pathToLastConfigUsed, paths.configFile, "utf-8");
}

export async function areArtifactsCached(paths: ProjectPaths) {
  const lastConfig = await getLastUsedConfig(paths);

  if (lastConfig !== paths.configFile) {
    await saveLastConfigUsed(paths);
    return false;
  }

  const lastSourcesModification = await getLastModificationDateInDir(
    paths.sources
  );

  const lastArtifactsModification = await getLastModificationDateInDir(
    paths.artifacts
  );

  const configModification = await getConfigModificationDate(paths.configFile);

  if (
    lastArtifactsModification === undefined ||
    lastSourcesModification === undefined
  ) {
    return false;
  }

  // If the config was changed we invalidate the cache
  if (configModification.getTime() > lastArtifactsModification.getTime()) {
    return false;
  }

  return (
    lastArtifactsModification.getTime() > lastSourcesModification.getTime()
  );
}
