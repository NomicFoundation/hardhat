const fsExtra = require("fs-extra");
const path = require("path");
const shell = require("shelljs");

shell.set("-e");

const rootDir = path.join(__dirname, "..", "..");
const hardhatCoreDir = path.join(rootDir, "packages", "hardhat-core");
const fixtureProjectsDir = path.join(__dirname, "test", "fixture-projects");

if (process.argv[2] !== "npm" && process.argv[2] !== "yarn") {
  console.error("Usage: node run-tests.js <npm|yarn>");
  process.exit(1);
}

const isYarn = process.argv[2] === "yarn";

async function main() {
  const fixtures = fsExtra
    .readdirSync(fixtureProjectsDir)
    .map((fixture) => path.join(fixtureProjectsDir, fixture));

  // we run the cleanup both before and after running the tests, just in case
  cleanup(fixtures);

  // build hardhat and install it in each fixture project
  const hardhatPackagePath = setup(fixtures);
  shell.cd(__dirname);

  // we don't throw if the tests fail so that we can cleanup things properly
  shell.set("+e");
  const mochaResult = shell.exec(`mocha --recursive \"test/**/*.ts\"`);
  shell.set("-e");

  cleanup(fixtures);
  // we remove the tgz file because some tests might reinstall the fixture
  // project dependencies, and that could fail if the tgz file isn't there
  // anymore
  shell.rm(hardhatPackagePath);

  process.exit(mochaResult.code);
}

/**
 * Build and package hardhat as a tgz file and install it in each fixture project.
 */
function setup(fixtures) {
  // cd into packages/hardhat-core
  shell.cd(hardhatCoreDir);

  // build and pack the project
  if (isYarn) {
    shell.exec("yarn build");
    shell.exec("yarn pack");
  } else {
    shell.exec("npm run build");
    shell.exec("npm pack");
  }

  // get the path to the tgz file
  const { version } = fsExtra.readJsonSync(
    path.join(hardhatCoreDir, "package.json")
  );

  let hardhatPackageName;
  if (isYarn) {
    hardhatPackageName = `hardhat-v${version}.tgz`;
  } else {
    hardhatPackageName = `hardhat-${version}.tgz`;
  }

  // We rename the tgz file to a unique name because apparently yarn uses the
  // path to a tgz to cache it, but we don't want it to ever be cached when we
  // are working on the e2e tests locally.
  //
  // To err on the side of safety, we always do this, even if it's only needed
  // for yarn.
  const newHardhatPackageName = `hardhat-${Date.now()}.tgz`;
  shell.mv(
    path.join(hardhatCoreDir, hardhatPackageName),
    path.join(hardhatCoreDir, newHardhatPackageName)
  );

  const hardhatPackagePath = path.join(hardhatCoreDir, newHardhatPackageName);

  // for each fixture project, cd into its directory, create
  // a package.json and install hardhat from the tgz file
  for (const fixtureDir of fixtures) {
    shell.cd(fixtureDir);

    // we copy the package.json from a template, because yarn
    // doesn't have a --no-save option
    const packageJsonTemplatePath = path.join(
      fixtureDir,
      "package.json.template"
    );
    const packageJsonPath = path.join(fixtureDir, "package.json");
    shell.cp(packageJsonTemplatePath, packageJsonPath);

    if (isYarn) {
      shell.exec(`yarn add ${hardhatPackagePath} --no-save`);
    } else {
      shell.exec(`npm install ${hardhatPackagePath} --no-save`);
    }
  }

  return hardhatPackagePath;
}

/**
 * Remove all the unnecessary files
 */
function cleanup(fixtures) {
  for (const fixtureDir of fixtures) {
    // remove the package.json we created during the setup
    const packageJsonPath = path.join(fixtureDir, "package.json");
    shell.rm("-f", packageJsonPath);

    // remove the yarn.lock file
    const yarnLockPath = path.join(fixtureDir, "yarn.lock");
    shell.rm("-f", yarnLockPath);

    // remove node_modules
    const nodeModulesPath = path.join(fixtureDir, "node_modules");
    shell.rm("-fr", nodeModulesPath);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
