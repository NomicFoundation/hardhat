const { noStripTypesFlag } = require("../../config/mocha.cjs");

module.exports = {
  require: "ts-node/register/transpile-only",
  "node-option": noStripTypesFlag,
};
