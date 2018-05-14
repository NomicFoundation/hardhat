"use strict";

const { getConfig } = require("../core/config");
const { getEnvBuidlerArguments } = require("./arguments");
const { createEnvironment } = require("../core/env/definition");

if (global.env !== undefined) {
  module.exports = global.env;
  return;
}

const config = getConfig();
const buidlerArguments = getEnvBuidlerArguments();

module.exports = createEnvironment(config, buidlerArguments);
