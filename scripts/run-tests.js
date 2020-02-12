const os = require("os");
const process = require("process");
const shell = require("shelljs");

process.env.FORCE_COLOR = "3";

// throw if a command fails
shell.config.fatal = true;

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;
const isLinux = os.type() === "Linux";
const isWindows = os.type() === "Windows_NT";

const shouldBuildTests = !isGithubActions;
const shouldIgnoreVyperTests = isGithubActions && !isLinux;
const shouldIgnoreSolppTests = isWindows;

shell.exec("npm run build");

if (shouldBuildTests) {
  shell.exec("npm run build-test");
}

process.env.TS_NODE_TRANSPILE_ONLY = "true";

shell.exec(
  `npx lerna exec ${
    shouldIgnoreVyperTests ? '--ignore "@nomiclabs/buidler-vyper"' : ""
  } ${
    shouldIgnoreSolppTests ? '--ignore "@nomiclabs/buidler-solpp"' : ""
  } --concurrency 1 -- npm run test`
);
