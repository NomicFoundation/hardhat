const { nativeStripTypesIsStable } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/files",
  file: "../common/run-with-ganache",
  ignore: [
    "test/fixture-projects/**/*",
  ],
  timeout: 60000,
  "node-option":
    nativeStripTypesIsStable ? "no-strip-types" : "no-experimental-strip-types",
};
