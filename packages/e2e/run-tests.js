const fsExtra = require("fs-extra");
const path = require("path");
const shell = require("shelljs");

shell.set("-e");

const rootDir = path.join(__dirname, "..", "..");
const hardhatCoreDir = path.join(rootDir, "packages", "hardhat-core");

if (process.argv[2] !== "npm" && process.argv[2] !== "yarn") {
  console.error("Usage: node run-tests.js <npm|yarn>");
  process.exit(1);
}

const isYarn = process.argv[2] === "yarn";

async function main() {
  // build hardhat and geth the path to the tgz
  const hardhatPackagePath = buildHardhat();
  shell.cd(__dirname);

  // we don't throw if the tests fail so that we can cleanup things properly
  shell.set("+e");
  const mochaResult = shell.exec(`mocha --recursive \"test/**/*.ts\"`, {
    env: {
      ...process.env,
      // the tests need this information to setup the fixture projects
      HARDHAT_E2E_PATH_TO_HARDHAT_TGZ: hardhatPackagePath,
      HARDHAT_E2E_IS_YARN: isYarn,
    },
  });
  shell.set("-e");

  // Remove the built package. If we don't do this, the hardhat-core directory
  // will have a new random tgz file in each e2e run.
  shell.rm(hardhatPackagePath);

  process.exit(mochaResult.code);
}

/**
 * Build and package hardhat as a tgz file and install it in each fixture project.
 */
function buildHardhat() {
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

  return path.join(hardhatCoreDir, newHardhatPackageName);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
