const process = require("process");
const shell = require("shelljs");

process.env.FORCE_COLOR = "3";

shell.config.fatal = true; // throw if a command fails

shell.exec("npx lerna bootstrap --no-ci");

// We delete these .bin folders because lerna creates them and then npm doesn't link the packages
shell.rm("-rf", "packages/*/node_modules/.bin");
