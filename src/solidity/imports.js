"use strict";

const importLazy = require("import-lazy")(require);
const solidityParser = importLazy("solidity-parser");

function getImports(resolvedFile) {
  return solidityParser.parse(resolvedFile.content, "imports");
}

module.exports = { getImports };
