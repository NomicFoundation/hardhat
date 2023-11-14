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

shell.exec("pnpm build");

// ** check for packages to be ignored ** //

// Solpp tests don't work in Windows
const shouldIgnoreSolppTests = isWindows;

const ignoredPackagesList = [];

if (shouldIgnoreSolppTests) {
  ignoredPackagesList.push("--filter=!@nomiclabs/hardhat-solpp");
}

const ignoredPackages = ignoredPackagesList.join(" ");

function runTests() {
  console.time("Total test time");

  try {
    const fastExit = process.env.NO_FAST_EXIT ? "--no-bail" : "--bail";
    const command = `pnpm run --recursive --workspace-concurrency 1 ${fastExit} ${ignoredPackages} test`;

    shell.exec(command);
  } finally {
    console.timeEnd("Total test time");
  }
}

async function main() {
  await runTests();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
