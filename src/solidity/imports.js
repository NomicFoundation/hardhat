"use strict";

function getImports(fileContent) {
  const parser = require("solidity-parser-antlr");
  const ast = parser.parse(fileContent, { tolerant: true });

  const importedFiles = [];

  parser.visit(ast, {
    ImportDirective: node => importedFiles.push(node.path)
  });

  return importedFiles;
}

module.exports = { getImports };