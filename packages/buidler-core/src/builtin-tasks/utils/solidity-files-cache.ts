import fsExtra from "fs-extra";
import * as t from "io-ts";
import * as path from "path";

import { SOLIDITY_FILES_CACHE_FILENAME } from "../../internal/constants";
import { ProjectPaths, SolcConfig } from "../../types";

const SolidityFilesCacheEntry = t.type({
  lastModificationDate: t.number,
  globalName: t.string,
  solcConfig: t.any,
  imports: t.array(t.string),
  versionPragmas: t.array(t.string),
  artifacts: t.array(t.string),
});

const SolidityFilesCacheCodec = t.record(t.string, SolidityFilesCacheEntry);

export type SolidityFilesCache = Record<
  string,
  {
    lastModificationDate: number;
    globalName: string;
    solcConfig: SolcConfig;
    imports: string[];
    versionPragmas: string[];
    artifacts: string[];
  }
>;

async function removeModifiedFiles(
  cache: SolidityFilesCache
): Promise<SolidityFilesCache> {
  const cleanedCache: SolidityFilesCache = {};

  for (const [absolutePath, cachedData] of Object.entries(cache)) {
    if (!fsExtra.existsSync(absolutePath)) {
      continue;
    }
    const stats = await fsExtra.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    if (lastModificationDate.valueOf() === cachedData.lastModificationDate) {
      cleanedCache[absolutePath] = cachedData;
    }
  }

  return cleanedCache;
}

export async function readSolidityFilesCache(
  paths: ProjectPaths
): Promise<SolidityFilesCache> {
  const solidityFilesCachePath = path.join(
    paths.cache,
    SOLIDITY_FILES_CACHE_FILENAME
  );

  let solidityFilesCacheRaw: any = {};
  if (fsExtra.existsSync(solidityFilesCachePath)) {
    solidityFilesCacheRaw = await fsExtra.readJson(solidityFilesCachePath);
  }

  const result = SolidityFilesCacheCodec.decode(solidityFilesCacheRaw);

  if (result.isRight()) {
    return removeModifiedFiles(result.value);
  }

  // tslint:disable-next-line only-buidler-error
  throw new Error("Couldn't read cache file, try running the clean task"); // TODO use BuidlerError
}

export function writeSolidityFilesCache(
  paths: ProjectPaths,
  solidityFilesCache: SolidityFilesCache
) {
  const solidityFilesCachePath = path.join(
    paths.cache,
    SOLIDITY_FILES_CACHE_FILENAME
  );

  fsExtra.ensureDirSync(paths.cache);

  fsExtra.writeJsonSync(solidityFilesCachePath, solidityFilesCache);
}
