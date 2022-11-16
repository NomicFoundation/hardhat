import { VyperFilesCache } from "./cache";

interface ParsedData {
  versionPragma: string;
}

export class Parser {
  private _cache = new Map<string, ParsedData>();

  constructor(
    private _vyperFilesCache: VyperFilesCache = VyperFilesCache.createEmpty()
  ) {}

  public parse(
    fileContent: string,
    absolutePath: string,
    contentHash: string
  ): ParsedData {
    const cacheResult = this._getFromCache(absolutePath, contentHash);

    if (cacheResult !== null) {
      return cacheResult;
    }

    const result: ParsedData = {
      versionPragma: parseVersionPragma(fileContent),
    };

    this._cache.set(contentHash, result);

    return result;
  }

  private _getFromCache(
    absolutePath: string,
    contentHash: string
  ): ParsedData | null {
    const internalCacheEntry = this._cache.get(contentHash);

    if (internalCacheEntry !== undefined) {
      return internalCacheEntry;
    }

    const vyperFilesCacheEntry = this._vyperFilesCache.getEntry(absolutePath);

    if (vyperFilesCacheEntry === undefined) {
      return null;
    }

    if (vyperFilesCacheEntry.contentHash !== contentHash) {
      return null;
    }

    const { versionPragma } = vyperFilesCacheEntry;

    return { versionPragma };
  }
}

function parseVersionPragma(fileContent: string): string {
  const versionPragmasRegex: RegExp = /#\s+@version\s+(.+)/g;

  const result = versionPragmasRegex.exec(fileContent);
  return result?.[1] ?? "*";
}
