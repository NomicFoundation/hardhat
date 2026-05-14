const { nativeStripTypesIsStable } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/transpile-only",
  "node-option":
    nativeStripTypesIsStable ? "no-strip-types" : "no-experimental-strip-types",
};
