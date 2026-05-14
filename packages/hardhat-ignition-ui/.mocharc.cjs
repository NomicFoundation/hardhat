const { noStripTypesFlag } = require("../../config/mocha.cjs");

const stripTypesFlag = noStripTypesFlag();

module.exports = {
  require: "ts-node/register/transpile-only",
  ...(stripTypesFlag ? { "node-option": stripTypesFlag } : {}),
};
