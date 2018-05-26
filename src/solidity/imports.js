"use strict";

const importLazy = require("import-lazy")(require);
const extract = importLazy("solidity-extract-imports");

function getImports(resolvedFile) {
  return extract(resolvedFile.content)
}

module.exports = { getImports };
