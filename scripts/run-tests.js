const os = require("os");
const shell = require("shelljs");

process.env.FORCE_COLOR = "3";

// skip ts-node type checks (this is already covered in previous 'build-test' script)
process.env.TS_NODE_TRANSPILE_ONLY = "true";

// throw if a command fails
shell.config.fatal = true;

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;
const isLinux = os.type() === "Linux";
const isWindows = os.type() === "Windows_NT";

// only Build tests in local environment
const shouldBuildTests = !isGithubActions;

shell.exec("npm run build");

if (shouldBuildTests) {
  shell.exec("npm run build-test");
}

// ** check for packages to be ignored ** //

// only run Vyper tests in Linux CI environment,
// and ignore if using a Windows machine (since Docker Desktop is required, only available windows Pro)
const shouldIgnoreVyperTests = (isGithubActions && !isLinux) || isWindows;

// Solpp tests don't work in Windows
const shouldIgnoreSolppTests = isWindows;

const ignoredPackages = [];

if (shouldIgnoreVyperTests) {
  ignoredPackages.push("@nomiclabs/buidler-vyper");
}

if (shouldIgnoreSolppTests) {
  ignoredPackages.push("@nomiclabs/buidler-solpp");
}

const nodeArgs = process.argv.slice(2);
const testArgs = nodeArgs.length > 0 && `-- ${nodeArgs.join(" ")}`;

const testRunCommand = `npm run test ${testArgs || ""}`;

function packagesToGlobStr(packages) {
  return packages.length === 1 ? packages[0] : `{${packages.join(",")}}`;
}

const ignoredPackagesFilter =
  Array.isArray(ignoredPackages) && ignoredPackages.length > 0
    ? `--ignore "${packagesToGlobStr(ignoredPackages)}"`
    : "";

shell.exec(
  `npx lerna exec ${ignoredPackagesFilter} ` +
    `--concurrency 1 -- ${testRunCommand}`
);
