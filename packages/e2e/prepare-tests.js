const fsExtra = require("fs-extra");
const path = require("path");
const shell = require("shelljs");

shell.set("-e");

const rootDir = path.join(__dirname, "..", "..");
const hardhatCoreDir = path.join(rootDir, "packages", "hardhat-core");
const fixtureProjectsDir = path.join(__dirname, "test", "fixture-projects")

async function main() {
  shell.cd(hardhatCoreDir);
  shell.exec("yarn build");
  shell.exec("yarn pack");

  const { version } = fsExtra.readJsonSync(path.join(hardhatCoreDir, "package.json"));
  const hardhatPackage = path.join(hardhatCoreDir, `hardhat-v${version}.tgz`)

  const fixtures = fsExtra.readdirSync(fixtureProjectsDir);

  for (const fixture of fixtures) {
    shell.cd(path.join(fixtureProjectsDir, fixture))
    shell.exec(`npm i ${hardhatPackage} --no-save`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
