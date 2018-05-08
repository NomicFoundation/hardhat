"use strict";

const { getConfig } = require("./config");
const { getEnvSoolArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

if (global.env !== undefined) {
  module.exports = global.env;
  return;
}

const config = getConfig();
const soolArguments = getEnvSoolArguments();

module.exports = createEnvironment(config, soolArguments);
