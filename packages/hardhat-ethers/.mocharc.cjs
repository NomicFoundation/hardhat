const { noStripTypesFlag } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/files",
  file: "../common/run-with-hardhat",
  ignore: [
    "test/fixture-projects/**/*",
  ],
  timeout: 10000,
  "node-option": noStripTypesFlag,
};
