import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { SolidityFilesCache } from "../builtin-tasks/utils/solidity-files-cache.js";

interface ParsedData {
  imports: string[];
  versionPragmas: string[];
}

export class Parser {
  readonly #cache = new Map<string, ParsedData>();
  readonly #solidityFilesCache: SolidityFilesCache;

  constructor(_solidityFilesCache?: SolidityFilesCache) {
    this.#solidityFilesCache =
      _solidityFilesCache ?? SolidityFilesCache.createEmpty();
  }

  public async parse(
    fileContent: string,
    absolutePath: string,
    contentHash: string,
  ): Promise<ParsedData> {
    const cacheResult = this.#getFromCache(absolutePath, contentHash);

    if (cacheResult !== null) {
      return cacheResult;
    }

    try {
      const { analyze } = await import("@nomicfoundation/solidity-analyzer");
      const result = analyze(fileContent);

      this.#cache.set(contentHash, result);

      return result;
    } catch (e) {
      ensureError(e);

      if (
        "code" in e &&
        typeof e.code === "string" &&
        e.code === "MODULE_NOT_FOUND"
      ) {
        throw new HardhatError(HardhatError.ERRORS.GENERAL.CORRUPTED_LOCKFILE);
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error -- Re-throwing the error
      throw e;
    }
  }

  /**
   * Get parsed data from the internal cache, or from the solidity files cache.
   *
   * Returns null if cannot find it in either one.
   */
  #getFromCache(absolutePath: string, contentHash: string): ParsedData | null {
    const internalCacheEntry = this.#cache.get(contentHash);

    if (internalCacheEntry !== undefined) {
      return internalCacheEntry;
    }

    const solidityFilesCacheEntry =
      this.#solidityFilesCache.getEntry(absolutePath);

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
