const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");
const path = require("path");
const chalk = importLazy("chalk");
const inquirer = importLazy("inquirer");

const { getRecommendedGitIgnore } = require("../core/project-structure");
const { emoji } = require("./emoji");

async function removeProjectDirIfPresent(projectRoot, dirName) {
  const dirPath = path.join(projectRoot, dirName);
  if (await fs.pathExists(dirPath)) {
    await fs.remove(dirPath);
  }
}

async function removeTempFilesIfPresent(projectRoot) {
  await removeProjectDirIfPresent(projectRoot, "cache");
  await removeProjectDirIfPresent(projectRoot, "artifacts");
}

function printAsciiLogo() {
  console.log(chalk.blue(`888               d8b      888 888`));
  console.log(chalk.blue(`888               Y8P      888 888`));
  console.log(chalk.blue("888                        888 888"));
  console.log(
    chalk.blue("88888b.  888  888 888  .d88888 888  .d88b.  888d888")
  );
  console.log(chalk.blue('888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"'));
  console.log(chalk.blue("888  888 888  888 888 888  888 888 88888888 888"));
  console.log(chalk.blue("888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888"));
  console.log(chalk.blue(`88888P"   "Y88888 888  "Y88888 888  "Y8888  888`));
  console.log("");
}

async function printWelcomeMessage() {
  const packageInfo = await fs.readJson(
    path.join(__dirname, "../../package.json")
  );

  console.log(
    chalk.cyan(
      `${emoji("👷 ")}Welcome to ${packageInfo.name} v${
        packageInfo.version
      }${emoji(" 👷‍♀")}‍\n`
    )
  );
}

async function confirmProjectCreation() {
  const { shouldCreateProject } = await inquirer.prompt([
    {
      name: "shouldCreateProject",
      type: "confirm",
      message:
        "You are not inside a buidler project. Do you want to create a new one?"
    }
  ]);

  return shouldCreateProject;
}

async function copySampleProject(projectRoot) {
  await fs.ensureDir(projectRoot);
  await fs.copy(
    path.join(__dirname, "..", "..", "sample-project"),
    projectRoot
  );

  // This is just in case we have been using the sample project for dev/testing
  await removeTempFilesIfPresent(projectRoot);

  await fs.remove(path.join(projectRoot, "LICENSE.md"));
}

async function addGitIgnore(projectRoot) {
  const gitIgnorePath = path.join(projectRoot, ".gitignore");

  let content = await getRecommendedGitIgnore();

  if (await fs.pathExists(gitIgnorePath)) {
    const existingContent = fs.readFile(gitIgnorePath, "utf-8");
    content = (await existingContent) + "\n" + content;
  }

  await fs.writeFile(gitIgnorePath, content);
}

function printSuggestedCommands() {
  console.log(`Try running running the following tasks:`);
  console.log(`  buidler compile`);
  console.log(`  buidler test`);
  console.log(`  buidler deploy`);
  console.log(`  node scripts/scripted-deployment.js`);
  console.log(`  buidler help`);
}

async function createProject() {
  printAsciiLogo();

  await printWelcomeMessage();

  const shouldCreateProject = await confirmProjectCreation();

  if (!shouldCreateProject) {
    return;
  }

  const { projectRoot, shouldAddGitIgnore } = await inquirer.prompt([
    {
      name: "projectRoot",
      default: process.cwd(),
      message: "Buidler project root:"
    },
    {
      name: "shouldAddGitIgnore",
      type: "confirm",
      message: "Do you want to add a .gitignore?"
    }
  ]);

  await copySampleProject(projectRoot);

  if (shouldAddGitIgnore) {
    await addGitIgnore(projectRoot);
  }

  console.log(chalk.cyan(`\n${emoji("✨ ")}Project created${emoji(" ✨")}`));

  console.log(``);

  printSuggestedCommands();
}

module.exports = { createProject };
