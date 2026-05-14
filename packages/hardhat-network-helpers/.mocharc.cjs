const { noStripTypesFlag } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/files",
  file: "./test/setup.ts",
  ignore: [
    "test/fixture-projects/**/*",
  ],
  timeout: 10000,
  "node-option": noStripTypesFlag,
};
