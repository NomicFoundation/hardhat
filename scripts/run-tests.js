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

// only run Vyper tests in Linux CI environment, and ignore if using a Windows machine (since Docker Desktop is required, only available windows Pro)
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
  return `{${packages.join(",")}}`;
}

// ** setup packages to be run in parallel and in series ** //
const parallelizablePackages = [
  "@nomiclabs/buidler",
  "@nomiclabs/buidler-docker",
  // "@nomiclabs/buidler-ethers",
  // "@nomiclabs/buidler-etherscan",
  "@nomiclabs/buidler-ganache",
  "@nomiclabs/buidler-solhint",
  "@nomiclabs/buidler-solpp",
  // "@nomiclabs/buidler-truffle4",
  // "@nomiclabs/buidler-truffle5",x`
  "@nomiclabs/buidler-vyper",
  "@nomiclabs/buidler-waffle"
].filter(p => !ignoredPackages.includes(p));

const ignoredPackagesGlobStr = packagesToGlobStr(ignoredPackages);
const parallelPackagesGlobStr = packagesToGlobStr(parallelizablePackages);

const parallelPackageFilter = `--scope "${parallelPackagesGlobStr}"`;
const seriesPackageFilter = ` --ignore "${ignoredPackagesGlobStr}" --ignore "${parallelPackagesGlobStr}"`;

// list packages to run in parallel
console.log("Running parallel tests in packages: ");
console.time("ls parallel");
shell.exec(`npx lerna ls ${parallelPackageFilter}`);
console.timeEnd("ls parallel");

// list packages to run in series
console.log("Running tests in series in the rest of packages: ");
console.time("ls series");
shell.exec(`npx lerna ls ${seriesPackageFilter}`);
console.timeEnd("ls series");

const lernaExecParallel = `npx lerna exec --parallel ${parallelPackageFilter} -- ${testRunCommand}`;
const lernaExecSeries = `npx lerna exec ${seriesPackageFilter} --stream --concurrency 1 -- ${testRunCommand}`;

// run parallelizable packages first
console.time("parallel");
shell.exec(lernaExecParallel, code => {
  console.log(`Parallel finished with status ${code}`); //TODO if status !== 0 force exit ?
  console.timeEnd("parallel");
});

// run the remaining packages in series
console.time("series");
shell.exec(lernaExecSeries, code => {
  console.log(`Series finished with status ${code}`);
  console.timeEnd("series");
});

// shell.exec(
//   `npx lerna exec --ignore "${ignoredPackagesGlobStr}" ` +
//   `--concurrency 1 -- ${testRunCommand}`
// );
