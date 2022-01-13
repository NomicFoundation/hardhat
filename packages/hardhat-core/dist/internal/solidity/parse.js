"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const debug_1 = __importDefault(require("debug"));
const solidity_files_cache_1 = require("../../builtin-tasks/utils/solidity-files-cache");
const log = (0, debug_1.default)("hardhat:core:solidity:imports");
class Parser {
    constructor(_solidityFilesCache) {
        this._cache = new Map();
        this._solidityFilesCache =
            _solidityFilesCache !== null && _solidityFilesCache !== void 0 ? _solidityFilesCache : solidity_files_cache_1.SolidityFilesCache.createEmpty();
    }
    parse(fileContent, absolutePath, contentHash) {
        const cacheResult = this._getFromCache(absolutePath, contentHash);
        if (cacheResult !== null) {
            return cacheResult;
        }
        let result;
        try {
            const parser = require("@solidity-parser/parser");
            const ast = parser.parse(fileContent, { tolerant: true });
            const imports = [];
            const versionPragmas = [];
            parser.visit(ast, {
                ImportDirective: (node) => imports.push(node.path),
                PragmaDirective: (node) => {
                    if (node.name === "solidity") {
                        versionPragmas.push(node.value);
                    }
                },
            });
            result = { imports, versionPragmas };
        }
        catch (error) {
            log("Failed to parse Solidity file to extract its imports, using regex fallback\n", error);
            result = {
                imports: findImportsWithRegexps(fileContent),
                versionPragmas: findVersionPragmasWithRegexps(fileContent),
            };
        }
        this._cache.set(contentHash, result);
        return result;
    }
    /**
     * Get parsed data from the internal cache, or from the solidity files cache.
     *
     * Returns null if cannot find it in either one.
     */
    _getFromCache(absolutePath, contentHash) {
        const internalCacheEntry = this._cache.get(contentHash);
        if (internalCacheEntry !== undefined) {
            return internalCacheEntry;
        }
        const solidityFilesCacheEntry = this._solidityFilesCache.getEntry(absolutePath);
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
exports.Parser = Parser;
function findImportsWithRegexps(fileContent) {
    const importsRegexp = /import\s+(?:(?:"([^;]*)"|'([^;]*)')(?:;|\s+as\s+[^;]*;)|.+from\s+(?:"(.*)"|'(.*)');)/g;
    let imports = [];
    let result;
    while (true) {
        result = importsRegexp.exec(fileContent);
        if (result === null) {
            return imports;
        }
        imports = [
            ...imports,
            ...result.slice(1).filter((m) => m !== undefined),
        ];
    }
}
function findVersionPragmasWithRegexps(fileContent) {
    const versionPragmasRegexp = /pragma\s+solidity\s+(.+?);/g;
    let versionPragmas = [];
    let result;
    while (true) {
        result = versionPragmasRegexp.exec(fileContent);
        if (result === null) {
            return versionPragmas;
        }
        versionPragmas = [
            ...versionPragmas,
            ...result.slice(1).filter((m) => m !== undefined),
        ];
    }
}
//# sourceMappingURL=parse.js.map