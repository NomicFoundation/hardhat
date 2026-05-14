const { nativeStripTypesIsStable } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/transpile-only",
  file: "./test/setup.ts",
  timeout: 20000,
  exit: true,
  ignore: [
    "**/fixture-projects/**/*",
  ],
  "node-option":
    nativeStripTypesIsStable ? "no-strip-types" : "no-experimental-strip-types",
};
