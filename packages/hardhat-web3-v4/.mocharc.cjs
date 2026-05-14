const { nativeStripTypesIsStable } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/files",
  file: "../common/run-with-hardhat.js",
  ignore: [
    "test/fixture-projects/**/*",
  ],
  timeout: 10000,
  "node-option":
    nativeStripTypesIsStable ? "no-strip-types" : "no-experimental-strip-types",
};
