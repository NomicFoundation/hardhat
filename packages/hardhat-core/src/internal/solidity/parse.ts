import type SolidityAnalyzerT from "@nomicfoundation/solidity-analyzer";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

interface ParsedData {
  imports: string[];
  versionPragmas: string[];
}

export class Parser {
  private _cache = new Map<string, ParsedData>();
  private _solidityFilesCache: SolidityFilesCache;

  constructor(_solidityFilesCache?: SolidityFilesCache) {
    this._solidityFilesCache =
      _solidityFilesCache ?? SolidityFilesCache.createEmpty();
  }

  public parse(
    fileContent: string,
    absolutePath: string,
    contentHash: string
  ): ParsedData {
    const cacheResult = this._getFromCache(absolutePath, contentHash);

    if (cacheResult !== null) {
      return cacheResult;
    }

    try {
      const { analyze } =
        require("@nomicfoundation/solidity-analyzer") as typeof SolidityAnalyzerT;
      const result = analyze(fileContent);

      this._cache.set(contentHash, result);

      return result;
    } catch (e: any) {
      if (e.code === "MODULE_NOT_FOUND") {
        throw new HardhatError(ERRORS.GENERAL.CORRUPTED_LOCKFILE);
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  /**
   * Get parsed data from the internal cache, or from the solidity files cache.
   *
   * Returns null if cannot find it in either one.
   */
  private _getFromCache(
    absolutePath: string,
    contentHash: string
  ): ParsedData | null {
    const internalCacheEntry = this._cache.get(contentHash);

    if (internalCacheEntry !== undefined) {
      return internalCacheEntry;
    }

    const solidityFilesCacheEntry =
      this._solidityFilesCache.getEntry(absolutePath);

    if (solidityFilesCacheEntry === undefined) {
      return null;
    }

    const { imports, versionPragmas } = solidityFilesCacheEntry;

    if (solidityFilesCacheEntry.contentHash !== contentHash) {
      return null;
    }

    return { imports, versionPragmas };
  }
}
