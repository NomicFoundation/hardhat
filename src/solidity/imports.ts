export function getImports(fileContent: string): string[] {
  const parser = require("solidity-parser-antlr");
  const ast = parser.parse(fileContent, { tolerant: true });

  const importedFiles: string[] = [];

  parser.visit(ast, {
    ImportDirective: (node: { path: string }) => importedFiles.push(node.path)
  });

  return importedFiles;
}
