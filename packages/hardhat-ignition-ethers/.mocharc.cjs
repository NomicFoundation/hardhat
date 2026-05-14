const { noStripTypesFlag } = require("../../config/mocha.cjs");

const stripTypesFlag = noStripTypesFlag();

module.exports = {
  require: "ts-node/register/transpile-only",
  file: "./test/setup.ts",
  timeout: 20000,
  exit: true,
  ...(stripTypesFlag ? { "node-option": stripTypesFlag } : {}),
};
