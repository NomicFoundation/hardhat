const { noStripTypesFlag } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/transpile-only",
  file: "./test/setup.ts",
  exclude: [
    "test/fixture-projects/**/*.ts",
    "test/fixture-projects/**/*.js",
    "test/helpers/**/*.ts",
  ],
  timeout: 25000,
  "node-option": noStripTypesFlag,
};
