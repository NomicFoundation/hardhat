const { noStripTypesFlag } = require("../../config/mocha.cjs");

module.exports = {
  require: [
    "ts-node/register/transpile-only",
  ],
  file: "./test/setup.ts",
  timeout: 25000,
  exclude: [
    "./test/helpers/**/*",
    "./test-integrations/fixture-projects/**/*",
    "./test-integrations/helpers/**/*",
  ],
  "node-option": noStripTypesFlag,
};
