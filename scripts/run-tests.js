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

shell.exec("yarn build");

if (shouldBuildTests) {
  shell.exec("yarn build-test");
}

// ** check for packages to be ignored ** //

// only run Vyper tests in Linux CI environment,
// and ignore if using a Windows machine (since Docker Desktop is required, only available windows Pro)
const shouldIgnoreVyperTests = (isGithubActions && !isLinux) || isWindows;

// Solpp tests don't work in Windows
const shouldIgnoreSolppTests = isWindows;

const ignoredPackagesList = [];

if (shouldIgnoreVyperTests) {
  ignoredPackagesList.push("--exclude @nomiclabs/hardhat-vyper");
}

if (shouldIgnoreSolppTests) {
  ignoredPackagesList.push("--exclude @nomiclabs/hardhat-solpp");
}

const ignoredPackages = ignoredPackagesList.join(" ");

const {
  cleanup,
  ganacheSetup,
} = require("../packages/common/dist/helper/ganache-provider");

async function useGanacheInstance() {
  try {
    return await ganacheSetup(["--deterministic"]);
  } catch (error) {
    error.message = `Could not setup own ganache instance: ${error.message}`;
    throw error;
  }
}

function runTests() {
  console.time("Total test time");

  try {
    shell.exec(
      `yarn wsrun --serial --fast-exit --exclude-missing ${ignoredPackages} test`
    );
  } finally {
    console.timeEnd("Total test time");
  }
}

async function main() {
  /* Ensure a ganache instance is running */
  const ganacheInstance = await useGanacheInstance();
  if (ganacheInstance) {
    console.log("** Running a Ganache instance for tests **");
  } else {
    console.log("** Using existing Ganache instance for tests **");
  }

  try {
    await runTests();
  } finally {
    /* Cleanup ganache instance */
    if (ganacheInstance) {
      console.log("** Tearing ganache instance down **");
      cleanup(ganacheInstance);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
