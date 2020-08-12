import debug from "debug";
import traverse from "traverse";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";

const log = debug("buidler:core:solidity:imports");

interface ParsedData {
  imports: string[];
  versionPragmas: string[];
}

export class Parser {
  public static getParsedDataFromAst(ast: any): ParsedData {
    const imports: string[] = [];
    const versionPragmas: string[] = [];

    traverse(ast).forEach((node) => {
      if (isImport(node)) {
        imports.push(node.file);
      }
      if (isVersionPragma(node)) {
        versionPragmas.push(node.literals.slice(1).join(""));
      }
    });

    return { imports, versionPragmas };
  }

  private _cache = new Map<string, ParsedData>();

  constructor(private _solidityFilesCache: SolidityFilesCache) {}

  public parse(fileContent: string, absolutePath: string): ParsedData {
    const cacheResult = this._getFromCache(absolutePath);

    if (cacheResult !== null) {
      return cacheResult;
    }

    let result;
    try {
      const parser = require("@solidity-parser/parser");
      const ast = parser.parse(fileContent, { tolerant: true });

      const imports: string[] = [];
      const versionPragmas: string[] = [];

      parser.visit(ast, {
        ImportDirective: (node: { path: string }) => imports.push(node.path),
        PragmaDirective: (node: { name: string; value: string }) => {
          if (node.name === "solidity") {
            versionPragmas.push(node.value);
          }
        },
      });

      result = { imports, versionPragmas };
    } catch (error) {
      log("Failed to parse Solidity file to extract its imports\n", error);
      result = {
        imports: findImportsWithRegexps(fileContent),
        versionPragmas: findVersionPragmasWithRegexps(fileContent),
      };
    }

    this._cache.set(absolutePath, result);

    return result;
  }

  private _getFromCache(absolutePath: string): ParsedData | null {
    if (this._solidityFilesCache[absolutePath] !== undefined) {
      const { imports, versionPragmas } = this._solidityFilesCache[
        absolutePath
      ];

      return { imports, versionPragmas };
    }

    return this._cache.get(absolutePath) ?? null;
  }
}

function findImportsWithRegexps(fileContent: string): string[] {
  const importsRegexp: RegExp = /import\s+(?:(?:"([^;]*)"|'([^;]*)')(?:;|\s+as\s+[^;]*;)|.+from\s+(?:"(.*)"|'(.*)');)/g;

  let imports: string[] = [];
  let result: RegExpExecArray | null;

  while (true) {
    result = importsRegexp.exec(fileContent);
    if (result === null) {
      return imports;
    }

    imports = [
      ...imports,
      ...result.slice(1).filter((m: any) => m !== undefined),
    ];
  }
}

function findVersionPragmasWithRegexps(fileContent: string): string[] {
  const versionPragmasRegexp: RegExp = /pragma\s+solidity\s+(.+?);/g;

  let versionPragmas: string[] = [];
  let result: RegExpExecArray | null;

  while (true) {
    result = versionPragmasRegexp.exec(fileContent);
    if (result === null) {
      return versionPragmas;
    }

    versionPragmas = [
      ...versionPragmas,
      ...result.slice(1).filter((m: any) => m !== undefined),
    ];
  }
}

function isImport(node: any): boolean {
  return node?.nodeType === "ImportDirective" && node?.file !== undefined;
}

function isVersionPragma(node: any): boolean {
  return (
    node?.nodeType === "PragmaDirective" && node?.literals?.[0] === "solidity"
  );
}
