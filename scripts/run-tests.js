const os = require("os");
const process = require("process");
const shell = require("shelljs");

process.env.FORCE_COLOR = "3";

// throw if a command fails
shell.config.fatal = true;

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;
const isLinux = os.type() === "Linux";
const isWindows = os.type() === "Windows_NT";

// only Build tests in local environment
const shouldBuildTests = !isGithubActions;

// only run Vyper tests in Linux CI environment, and ignore if using a Windows machine (since Docker Desktop is required, only available windows Pro)
const shouldIgnoreVyperTests = isGithubActions && !isLinux || isWindows;

// Solpp tests don't work in Windows
const shouldIgnoreSolppTests = isWindows;

shell.exec("npm run build");

if (shouldBuildTests) {
  shell.exec("npm run build-test");
}

process.env.TS_NODE_TRANSPILE_ONLY = "true";

const nodeArgs = process.argv.slice(2);
const testArgs = nodeArgs.length > 0 && `-- ${nodeArgs.join(" ")}`;

const testRunCommand = `npm run test ${testArgs || ""}`;



shell.exec(
  `npx lerna exec ${
    shouldIgnoreVyperTests ? '--ignore "@nomiclabs/buidler-vyper"' : ""
  } ${
    shouldIgnoreSolppTests ? '--ignore "@nomiclabs/buidler-solpp"' : ""
  } --concurrency 1 -- ${testRunCommand}`
);
