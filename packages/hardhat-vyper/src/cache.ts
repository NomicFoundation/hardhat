import type { LoDashStatic } from "lodash";
import type { ProjectPathsConfig } from "hardhat/types/config";
import type { VyperConfig } from "./types";

import path from "path";
import fsExtra from "fs-extra";
import * as t from "io-ts";

import { CACHE_FORMAT_VERSION, VYPER_FILES_CACHE_FILENAME } from "./constants";
import { getLogger } from "./util";

const log = getLogger("cache");

const CacheEntryCodec = t.type({
  lastModificationDate: t.number,
  contentHash: t.string,
  sourceName: t.string,
  vyperConfig: t.any,
  versionPragma: t.string,
  artifacts: t.array(t.string),
});

const CacheCodec = t.type({
  _format: t.string,
  files: t.record(t.string, CacheEntryCodec),
});

export interface CacheEntry {
  lastModificationDate: number;
  contentHash: string;
  sourceName: string;
  vyperConfig: VyperConfig;
  versionPragma: string;
  artifacts: string[];
}

export interface Cache {
  _format: string;
  files: Record<string, CacheEntry>;
}

export class VyperFilesCache {
  constructor(private _cache: Cache) {}

  public static createEmpty(): VyperFilesCache {
    return new VyperFilesCache({ _format: CACHE_FORMAT_VERSION, files: {} });
  }

  public static async readFromFile(
    vyperFilesCachePath: string
  ): Promise<VyperFilesCache> {
    const cacheRaw: Cache = fsExtra.existsSync(vyperFilesCachePath)
      ? fsExtra.readJSONSync(vyperFilesCachePath)
      : {
          _format: CACHE_FORMAT_VERSION,
          files: {},
        };

    const result = CacheCodec.decode(cacheRaw);

    if (result.isRight()) {
      const vyperFilesCache = new VyperFilesCache(result.value);
      await vyperFilesCache.removeNonExistingFiles();
      return vyperFilesCache;
    }

    log("There was a problem reading the cache");

    return VyperFilesCache.createEmpty();
  }

  public async removeNonExistingFiles() {
    for (const absolutePath of Object.keys(this._cache.files)) {
      if (!fsExtra.existsSync(absolutePath)) {
        this.removeEntry(absolutePath);
      }
    }
  }

  public async writeToFile(vyperFilesCachePath: string) {
    await fsExtra.outputJson(vyperFilesCachePath, this._cache, { spaces: 2 });
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
    contentHash: string,
    vyperConfig?: VyperConfig
  ): boolean {
    const { isEqual }: LoDashStatic = require("lodash");

    const cacheEntry = this.getEntry(absolutePath);

    if (cacheEntry === undefined) {
      // new file or no cache available, assume it's new
      return true;
    }

    if (cacheEntry.contentHash !== contentHash) {
      return true;
    }

    if (
      vyperConfig !== undefined &&
      !isEqual(vyperConfig, cacheEntry.vyperConfig)
    ) {
      return true;
    }

    return false;
  }
}

export function getVyperFilesCachePath(paths: ProjectPathsConfig): string {
  return path.join(paths.cache, VYPER_FILES_CACHE_FILENAME);
}
