import type { SolcConfig } from "../../types/index.js";

import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import debug from "debug";
import { deepEqual } from "fast-equals";
import * as t from "io-ts";

const log = debug("hardhat:core:tasks:compile:cache");

const FORMAT_VERSION = "hh-sol-cache-2";

const CacheEntryCodec = t.type({
  lastModificationDate: t.number,
  contentHash: t.string,
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
  contentHash: string;
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
  readonly #cache: Cache;

  public static createEmpty(): SolidityFilesCache {
    return new SolidityFilesCache({
      _format: FORMAT_VERSION,
      files: {},
    });
  }

  public static async readFromFile(
    solidityFilesCachePath: string,
  ): Promise<SolidityFilesCache> {
    let cacheRaw: Cache = {
      _format: FORMAT_VERSION,
      files: {},
    };
    if (await exists(solidityFilesCachePath)) {
      cacheRaw = await readJsonFile(solidityFilesCachePath);
    }

    const result = CacheCodec.decode(cacheRaw);

    if (result.isRight()) {
      const solidityFilesCache = new SolidityFilesCache(result.value);
      await solidityFilesCache.removeNonExistingFiles();
      return solidityFilesCache;
    }

    log("There was a problem reading the cache");

    return new SolidityFilesCache({
      _format: FORMAT_VERSION,
      files: {},
    });
  }

  constructor(_cache: Cache) {
    this.#cache = _cache;
  }

  public async removeNonExistingFiles() {
    await Promise.all(
      Object.keys(this.#cache.files).map(async (absolutePath) => {
        if (!(await exists(absolutePath))) {
          this.removeEntry(absolutePath);
        }
      }),
    );
  }

  public async writeToFile(solidityFilesCachePath: string) {
    await writeJsonFile(solidityFilesCachePath, this.#cache);
  }

  public addFile(absolutePath: string, entry: CacheEntry) {
    this.#cache.files[absolutePath] = entry;
  }

  public getEntries(): CacheEntry[] {
    return Object.values(this.#cache.files);
  }

  public getEntry(file: string): CacheEntry | undefined {
    return this.#cache.files[file];
  }

  public removeEntry(file: string) {
    delete this.#cache.files[file];
  }

  public hasFileChanged(
    absolutePath: string,
    contentHash: string,
    solcConfig?: SolcConfig,
  ): boolean {
    const cacheEntry = this.getEntry(absolutePath);

    if (cacheEntry === undefined) {
      // new file or no cache available, assume it's new
      return true;
    }

    if (cacheEntry.contentHash !== contentHash) {
      return true;
    }

    if (
      solcConfig !== undefined &&
      !deepEqual(solcConfig, cacheEntry.solcConfig)
    ) {
      return true;
    }

    return false;
  }
}
