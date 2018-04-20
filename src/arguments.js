const minimist = require("minimist");

const SOOL_ENV_ARGUMENT_PREFIX = "SOOL_";

function getSoolArguments() {
  const rawCliArgs = minimist(process.argv.slice(2));

  const soolCliArgs = Object.entries(rawCliArgs).filter(([k, v]) => k !== "_");

  const envArgs = Object.entries(process.env)
    .filter(([k, v]) => k.startsWith(SOOL_ENV_ARGUMENT_PREFIX))
    .map(([k, v]) => [
      k.slice(SOOL_ENV_ARGUMENT_PREFIX.length).toLowerCase(),
      v
    ]);

  const args = {};

  for (const [k, v] of envArgs) {
    args[k] = v;
  }

  for (const [k, v] of soolCliArgs) {
    args[k] = v;
  }

  return args;
}

function getTaskToRun() {
  const args = minimist(process.argv.slice(2));
  return args._[0] || "help";
}

function getTaskArguments() {
  const args = minimist(process.argv.slice(2));
  return args._.slice(1);
}

module.exports = { getSoolArguments, getTaskToRun, getTaskArguments };
