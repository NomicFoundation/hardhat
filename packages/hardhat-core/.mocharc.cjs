const { noStripTypesFlag } = require("../../config/mocha.cjs");

const stripTypesFlag = noStripTypesFlag();

module.exports = {
  require: "ts-node/register/transpile-only",
  file: "./test/setup.ts",
  exclude: [
    "test/fixture-projects/**/*.ts",
    "test/fixture-projects/**/*.js",
    "test/helpers/**/*.ts",
  ],
  timeout: 25000,
  ...(stripTypesFlag ? { "node-option": stripTypesFlag } : {}),
};
