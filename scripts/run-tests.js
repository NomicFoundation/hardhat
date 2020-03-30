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

function getTestArgsOrDefaults() {
  const testNodeArgs = process.argv.slice(2);
  const testNodeArgsLookupStr = testNodeArgs.join(" ");

  // use default unlimited timeout, as we are running most of them in parallel and some tests may take too long.
  if (!/(no-)?timeout/.test(testNodeArgsLookupStr)) {
    testNodeArgs.push('--timeout "0"');
  }

  // use default reporter "dot", for less verbose output
  // this reporter is good for limited output of mostly failed errors and elapsed times
  if (!/reporter(?!-)/.test(testNodeArgsLookupStr)) {
    // testNodeArgs.push('--reporter "dot"');
  }

  return testNodeArgs.length > 0 ? `-- ${testNodeArgs.join(" ")}` : "";
}

const testRunCommand = `npm run test ${getTestArgsOrDefaults()}`;
console.log({ testRunCommand });

function packagesToGlobStr(packages) {
  return packages.length === 1 ? packages[0] : `{${packages.join(",")}}`;
}

// ** setup packages to be run in parallel and in series ** //

// Packages requiring a running ganache instance are run in series
// as an attempt to not overload the process resulting in a slower
// operation.  The rest of packages, are all run in parallel.
const ganacheDependantPackages = [
  "@nomiclabs/buidler-ethers",
  "@nomiclabs/buidler-etherscan",
  "@nomiclabs/buidler-truffle4",
  "@nomiclabs/buidler-truffle5",
  "@nomiclabs/buidler-web3",
  "@nomiclabs/buidler-web3-legacy"
].filter(p => !ignoredPackages.includes(p));

const ganacheDependantPackagesGlobStr = packagesToGlobStr(
  ganacheDependantPackages
);

const ignoredPackagesFilter =
  Array.isArray(ignoredPackages) && ignoredPackages.length > 0
    ? `--ignore "${packagesToGlobStr(ignoredPackages)}"`
    : "";

const parallelPackageFilter = `${ignoredPackagesFilter} --ignore "${ganacheDependantPackagesGlobStr}"`;
const seriesPackageFilter = ` ${ignoredPackagesFilter} --scope "${ganacheDependantPackagesGlobStr}"`;

const runTest = `run test`;
const testArgs = `--  ${getTestArgsOrDefaults()}`;
const lernaExecParallel = `echo 'no parallel run'` ; //`npx lerna ${runTest} --parallel ${parallelPackageFilter} ${testArgs}`;
// const lernaExecSeries = `npx lerna ${runTest} --concurrency 1 --stream ${seriesPackageFilter} ${testArgs}`;

const lernaExecSeries = `npx lerna ${runTest} --concurrency 1 --stream ${ignoredPackagesFilter} ${testArgs}`;

const {
  cleanup,
  ganacheSetup
} = require("../packages/common/dist/helper/ganache-provider");

async function useGanacheInstance() {
  try {
    return await ganacheSetup(["--deterministic"]);
  } catch (error) {
    error.message = `Could not setup own ganache instance: ${error.message}`;
    throw error;
  }
}

function shellExecAsync(cmd, opts = {}) {
  return new Promise(function(resolve, reject) {
    // Execute the command, reject if we exit non-zero (i.e. error)
    shell.exec(cmd, opts, function(code, stdout, stderr) {
      if (code !== 0) return reject(new Error(stderr));
      return resolve(stdout);
    });
  });
}

async function runTests() {
  console.log({ lernaExecParallel });
  console.log({ lernaExecSeries });

  // Measure execution times
  console.time("Total test time");
  console.time("parallel exec");
  console.time("series exec");
  await Promise.all([
    shellExecAsync(lernaExecParallel).then(() =>
      console.timeEnd("parallel exec")
    ),
    shellExecAsync(lernaExecSeries).then(() => console.timeEnd("series exec"))
  ]);

  console.timeEnd("Total test time");
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
    /* Run all tests */
    await runTests();
  } finally {
    /* Cleanup ganache instance */
    if (ganacheInstance) {
      console.log("** Tearing ganache instance down **");
      cleanup(ganacheInstance);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
