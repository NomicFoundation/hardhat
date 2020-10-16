import fsExtra from "fs-extra";
import * as t from "io-ts";
import type { LoDashStatic } from "lodash";
import * as path from "path";

import { SOLIDITY_FILES_CACHE_FILENAME } from "../../internal/constants";
import type { ProjectPathsConfig, SolcConfig } from "../../types";

const FORMAT_VERSION = "hh-sol-cache-1";

const CacheEntryCodec = t.type({
  lastModificationDate: t.number,
  sourceName: t.string,
  solcConfig: t.any,
  imports: t.array(t.string),
  versionPragmas: t.array(t.string),
  artifacts: t.array(t.string),
});

const CacheCodec = t.type({
  _format: t.string,
  files: t.record(t.string, CacheEntryCodec),
});

export interface CacheEntry {
  lastModificationDate: number;
  sourceName: string;
  solcConfig: SolcConfig;
  imports: string[];
  versionPragmas: string[];
  artifacts: string[];
}

export interface Cache {
  _format: string;
  files: Record<string, CacheEntry>;
}

export class SolidityFilesCache {
  public static async readFromFile(
    solidityFilesCachePath: string
  ): Promise<SolidityFilesCache> {
    let cacheRaw: Cache = {
      _format: FORMAT_VERSION,
      files: {},
    };
    if (fsExtra.existsSync(solidityFilesCachePath)) {
      cacheRaw = await fsExtra.readJson(solidityFilesCachePath);
    }

    const result = CacheCodec.decode(cacheRaw);

    if (result.isRight()) {
      const solidityFilesCache = new SolidityFilesCache(result.value);
      await solidityFilesCache.removeModifiedFiles();
      return solidityFilesCache;
    }

    // tslint:disable-next-line only-hardhat-error
    throw new Error("Couldn't read cache file, try running the clean task"); // TODO use HardhatError
  }

  constructor(private _cache: Cache) {}

  public async removeModifiedFiles() {
    for (const [absolutePath, cachedData] of Object.entries(
      this._cache.files
    )) {
      if (!fsExtra.existsSync(absolutePath)) {
        this.removeEntry(absolutePath);
        continue;
      }
      const stats = await fsExtra.stat(absolutePath);
      const lastModificationDate = new Date(stats.ctime);

      if (lastModificationDate.valueOf() !== cachedData.lastModificationDate) {
        this.removeEntry(absolutePath);
      }
    }
  }

  public async writeToFile(solidityFilesCachePath: string) {
    await fsExtra.outputJson(solidityFilesCachePath, this._cache, {
      spaces: 2,
    });
  }

  public addFile(absolutePath: string, entry: CacheEntry) {
    this._cache.files[absolutePath] = entry;
  }

  public getEntries(): CacheEntry[] {
    return Object.values(this._cache.files);
  }

  public getEntry(file: string): CacheEntry | undefined {
    return this._cache.files[file];
  }

  public removeEntry(file: string) {
    delete this._cache.files[file];
  }

  public hasFileChanged(
    absolutePath: string,
    lastModificationDate: Date,
    solcConfig?: SolcConfig
  ): boolean {
    const { isEqual }: LoDashStatic = require("lodash");

    const cacheEntry = this.getEntry(absolutePath);

    if (cacheEntry === undefined) {
      // new file or no cache available, assume it's new
      return true;
    }

    if (cacheEntry.lastModificationDate < lastModificationDate.valueOf()) {
      return true;
    }

    if (
      solcConfig !== undefined &&
      !isEqual(solcConfig, cacheEntry.solcConfig)
    ) {
      return true;
    }

    return false;
  }
}

export function getSolidityFilesCachePath(paths: ProjectPathsConfig): string {
  return path.join(paths.cache, SOLIDITY_FILES_CACHE_FILENAME);
}
