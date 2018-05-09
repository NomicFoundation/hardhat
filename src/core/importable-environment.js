"use strict";

const { getConfig } = require("./config");
const { getEnvBuidlerArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

if (global.env !== undefined) {
  module.exports = global.env;
  return;
}

const config = getConfig();
const buidlerArguments = getEnvBuidlerArguments();

module.exports = createEnvironment(config, buidlerArguments);
