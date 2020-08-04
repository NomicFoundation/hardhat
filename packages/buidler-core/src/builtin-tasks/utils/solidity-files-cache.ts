import fsExtra from "fs-extra";
import * as t from "io-ts";
import * as path from "path";

import { SOLIDITY_FILES_CACHE_FILENAME } from "../../internal/constants";
import { ProjectPaths, SolcConfig } from "../../types";

const SolidityFilesCacheEntry = t.type({
  lastModificationDate: t.number,
  solcConfig: t.any,
});

const SolidityFilesCacheCodec = t.record(t.string, SolidityFilesCacheEntry);

export type SolidityFilesCache = Record<
  string,
  {
    lastModificationDate: number;
    solcConfig: SolcConfig;
  }
>;

export function readSolidityFilesCache(
  paths: ProjectPaths
): SolidityFilesCache {
  const solidityFilesCachePath = path.join(
    paths.cache,
    SOLIDITY_FILES_CACHE_FILENAME
  );

  let solidityFilesCacheRaw: any = {};
  if (fsExtra.existsSync(solidityFilesCachePath)) {
    solidityFilesCacheRaw = fsExtra.readJsonSync(solidityFilesCachePath);
  }

  const result = SolidityFilesCacheCodec.decode(solidityFilesCacheRaw);

  if (result.isRight()) {
    return result.value;
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
