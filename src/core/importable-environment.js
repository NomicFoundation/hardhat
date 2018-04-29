const { getConfig } = require("./config");
const { getEnvSoolArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

const config = getConfig();
const soolArguments = getEnvSoolArguments();
const env = createEnvironment(config, soolArguments);

module.exports = env;
