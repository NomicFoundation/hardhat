import debug from "debug";

const log = debug("buidler:core:solidity:imports");

export function getImports(fileContent: string): string[] {
  try {
    const parser = require("@solidity-parser/parser");
    const ast = parser.parse(fileContent, { tolerant: true });

    const importedFiles: string[] = [];

    parser.visit(ast, {
      ImportDirective: (node: { path: string }) =>
        importedFiles.push(node.path),
    });

    return importedFiles;
  } catch (error) {
    log("Failed to parse Solidity file to extract its imports\n", error);
    return findImportsWithRegexps(fileContent);
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
