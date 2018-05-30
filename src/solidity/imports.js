"use strict";

const importLazy = require("import-lazy")(require);
const parser = importLazy("solidity-parser-antlr");

function getImports(resolvedFile) {
  const ast = parser.parse(resolvedFile.content, { tolerant: true });

  const importedFiles = [];

  parser.visit(ast, {
    ImportDirective: node => importedFiles.push(node.path)
  });

  return importedFiles;
}

module.exports = { getImports };