const os = require("os");
const shell = require("shelljs");
const fs = require("fs");
const path = require("path");

process.env.FORCE_COLOR = "3";

// skip ts-node type checks (this is already covered in previous 'build-test' script)
process.env.TS_NODE_TRANSPILE_ONLY = "true";

// throw if a command fails
shell.config.fatal = true;

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;
const isLinux = os.type() === "Linux";
const isWindows = os.type() === "Windows_NT";

shell.exec("npm run build");

// ** check for packages to be ignored ** //

// Solpp tests don't work in Windows
const shouldIgnoreSolppTests = isWindows;

const ignoredPackagesList = [];

if (shouldIgnoreSolppTests) {
  ignoredPackagesList.push("@nomiclabs/hardhat-solpp");
}

function runTests() {
  console.time("Total test time");

  const workspaces = getWorkspaces();
  try {
    for (const workspace of workspaces) {
      if (ignoredPackagesList.includes(workspace)) continue;

      shell.exec(`npm run test -w ${workspace} --if-present`);
    }
  } finally {
    console.timeEnd("Total test time");
    console.log(
      `Tested ${totTested - ignoredPackagesList.length}/${
        workspaces.length
      } workspaces, skipped ${ignoredPackagesList.length}/${
        workspaces.length
      } workspaces`
    );
  }
}

async function main() {
  await runTests();
}

function getWorkspaces() {
  const workspacesObj = JSON.parse(shell.exec("npm query .workspace"));
  return Object.values(workspacesObj).map((w) => w.name);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
