import { VyperFilesCache } from "./cache";
import { VyperPluginError } from "./util";

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
    this._validateTestModeNotUsed(fileContent, absolutePath);

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

  private _validateTestModeNotUsed(fileContent: string, absolutePath: string) {
    if (fileContent.includes('#@ if mode == "test":')) {
      throw new VyperPluginError(
        `We found a test directive in the file at path ${absolutePath}.` +
          ` Test directives are a Brownie feature not supported by Hardhat.` +
          ` Learn more at https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-vyper#test-directives`
      );
    }
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
