"use strict";
const solidityParser = require("solidity-parser");

function getImports(resolvedFile) {
  return solidityParser.parse(resolvedFile.content, "imports");
}

module.exports = { getImports };
