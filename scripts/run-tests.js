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
  ignoredPackagesList.push("packages/hardhat-solpp");
}

function runTests() {
  console.time("Total test time");

  try {
    const fastExit = !process.env.NO_FAST_EXIT;
    const failedWorkspaces = [];

    for (const workspace of getWorkspaces()) {
      if (ignoredPackagesList.includes(workspace)) continue;

      try {
        shell.exec(`npm run test -w ${workspace} --if-present`);
      } catch (err) {
        if (fastExit) throw err;
        failedWorkspaces.push(workspace);
      }
    }

    if (failedWorkspaces.length > 0) {
      throw new Error(
        `The following workspace(s) failed the tests: ${failedWorkspaces.join(
          ", "
        )}`
      );
    }
  } finally {
    console.timeEnd("Total test time");
  }
}

async function main() {
  await runTests();
}

function getWorkspaces() {
  const pathToWorkspaces = `${__dirname}/../packages`;

  return fs
    .readdirSync(pathToWorkspaces)
    .filter((file) =>
      fs.statSync(path.join(pathToWorkspaces, file)).isDirectory()
    )
    .map((dirName) => `packages/${dirName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
