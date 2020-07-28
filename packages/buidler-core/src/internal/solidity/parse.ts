import debug from "debug";

const log = debug("buidler:core:solidity:imports");

export function parse(
  fileContent: string
): { imports: string[]; versionPragmas: string[] } {
  try {
    const parser = require("@solidity-parser/parser");
    const ast = parser.parse(fileContent, { tolerant: true });

    const importedFiles: string[] = [];
    const versionPragmas: string[] = [];

    parser.visit(ast, {
      ImportDirective: (node: { path: string }) =>
        importedFiles.push(node.path),
      PragmaDirective: (node: { name: string; value: string }) => {
        if (node.name === "solidity") {
          versionPragmas.push(node.value);
        }
      },
    });

    return { imports: importedFiles, versionPragmas };
  } catch (error) {
    log("Failed to parse Solidity file to extract its imports\n", error);
    return {
      imports: findImportsWithRegexps(fileContent),
      versionPragmas: findVersionPragmasWithRegexps(fileContent),
    };
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
