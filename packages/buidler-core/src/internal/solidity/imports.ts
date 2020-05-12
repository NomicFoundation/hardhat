import debug from "debug";

import { ErrorReporter } from "../error-reporter/error-reporter";

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
    const logMsg = "Failed to parse Solidity file to extract its imports";
    log(`${logMsg}\n`, error);
    error.message = `${logMsg}. Reason: ${error.message || error}`;
    ErrorReporter.getInstance()
      .sendErrorReport(error)
      .catch((error) => log(`failed error report send`, error));
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
