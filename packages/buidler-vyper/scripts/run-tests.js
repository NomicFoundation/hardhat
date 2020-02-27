const process = require("process");
const shell = require("shelljs");

shell.config.fatal = true;
process.env.FORCE_COLOR = "3";

shell.exec("node ../../node_modules/mocha/bin/mocha --exit");
