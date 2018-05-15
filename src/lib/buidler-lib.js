"use strict";

const { getConfig } = require("../core/config");
const { getEnvBuidlerArguments } = require("../core/params/env-variables");
const { BUIDLER_PARAM_DEFINITIONS } = require("../core/params/buidler-params");
const { createEnvironment } = require("../core/env/definition");

if (global.env !== undefined) {
  module.exports = global.env;
  return;
}

const config = getConfig();
const buidlerArguments = getEnvBuidlerArguments(BUIDLER_PARAM_DEFINITIONS);

module.exports = createEnvironment(config, buidlerArguments);
