import fsExtra from "fs-extra";
import isEqual from "lodash/isEqual";
import path from "path";

import { glob } from "../../internal/util/glob";
import { getPackageJson } from "../../internal/util/packageInfo";
import { ProjectPaths, SolcConfig } from "../../types";

// Checks the earliest date of modification for compiled files against the latest date for source files (including libraries).
// Furthermore, cache is invalidated if Buidler's version changes, or a different solc version is set in the buidler config.
export async function areArtifactsCached(
  sourceTimestamps: number[],
  newSolcConfig: SolcConfig,
  paths: ProjectPaths
): Promise<boolean> {
  const oldConfig = await getLastUsedConfig(paths.cache);

  if (
    oldConfig === undefined ||
    !compareSolcConfigs({
      oldConfig: oldConfig.solc,
      newConfig: newSolcConfig
    }) ||
    !(await compareBuidlerVersion(oldConfig.buidlerVersion))
  ) {
    return false;
  }

  const maxSourceDate = getMaxSourceDate(sourceTimestamps);
  const minArtifactDate = await getMinArtifactDate(paths.artifacts);

  return maxSourceDate < minArtifactDate;
}

async function getModificationDatesInDir(dir: string): Promise<number[]> {
  const pattern = path.join(dir, "**", "*");
  const files = await glob(pattern);

  return Promise.all(
    files.map(async file => (await fsExtra.stat(file)).mtimeMs)
  );
}

function getMaxSourceDate(sourceTimestamps: number[]): number {
  return Math.max(...sourceTimestamps);
}

async function getMinArtifactDate(artifactsPath: string): Promise<number> {
  const timestamps = await getModificationDatesInDir(artifactsPath);

  return Math.min(...timestamps);
}

const LAST_CONFIG_USED_FILENAME = "last-solc-config.json";

function getPathToCachedLastConfigPath(cachePath: string) {
  const pathToLastConfigUsed = path.join(cachePath, LAST_CONFIG_USED_FILENAME);

  return pathToLastConfigUsed;
}

async function getLastUsedConfig(
  cachePath: string
): Promise<{ solc: SolcConfig; buidlerVersion: string } | undefined> {
  const pathToConfig = getPathToCachedLastConfigPath(cachePath);

  if (!(await fsExtra.pathExists(pathToConfig))) {
    return undefined;
  }

  return module.require(pathToConfig);
}

export async function cacheBuidlerConfig(
  paths: ProjectPaths,
  config: SolcConfig
) {
  const pathToLastConfigUsed = getPathToCachedLastConfigPath(paths.cache);
  const newJson = {
    solc: config,
    buidlerVersion: await getCurrentBuidlerVersion()
  };

  await fsExtra.ensureDir(path.dirname(pathToLastConfigUsed));

  return fsExtra.writeFile(
    pathToLastConfigUsed,
    JSON.stringify(newJson),
    "utf-8"
  );
}

async function getSolcConfig(configPath: string): Promise<SolcConfig> {
  const solcConfig: SolcConfig = (await module.require(configPath)).solc;

  return solcConfig;
}

function compareSolcConfigs({
  oldConfig,
  newConfig
}: {
  oldConfig: SolcConfig;
  newConfig: SolcConfig;
}): boolean {
  return isEqual(oldConfig, newConfig);
}

async function getCurrentBuidlerVersion(): Promise<string> {
  const packageJson = await getPackageJson();

  return packageJson.version;
}

async function compareBuidlerVersion(
  lastBuidlerVersion: string
): Promise<boolean> {
  const currentVersion = await getCurrentBuidlerVersion();

  return lastBuidlerVersion === currentVersion;
}
