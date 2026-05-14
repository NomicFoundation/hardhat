const { noStripTypesFlag } = require("../../config/mocha.cjs");

const stripTypesFlag = noStripTypesFlag();

module.exports = {
  require: "ts-node/register/files",
  ignore: [
    "test/fixture-projects/**/*",
  ],
  timeout: 40000,
  ...(stripTypesFlag ? { "node-option": stripTypesFlag } : {}),
};
