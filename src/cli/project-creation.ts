import colors from "ansi-colors";
import path from "path";

import { getRecommendedGitIgnore } from "../core/project-structure";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";

import { emoji } from "./emoji";

async function removeProjectDirIfPresent(projectRoot: string, dirName: string) {
  const fsExtra = await import("fs-extra");
  const dirPath = path.join(projectRoot, dirName);
  if (await fsExtra.pathExists(dirPath)) {
    await fsExtra.remove(dirPath);
  }
}

async function removeTempFilesIfPresent(projectRoot: string) {
  await removeProjectDirIfPresent(projectRoot, "cache");
  await removeProjectDirIfPresent(projectRoot, "artifacts");
}

function printAsciiLogo() {
  console.log(colors.blue(`888               d8b      888 888`));
  console.log(colors.blue(`888               Y8P      888 888`));
  console.log(colors.blue("888                        888 888"));
  console.log(
    colors.blue("88888b.  888  888 888  .d88888 888  .d88b.  888d888")
  );
  console.log(colors.blue('888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"'));
  console.log(colors.blue("888  888 888  888 888 888  888 888 88888888 888"));
  console.log(colors.blue("888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888"));
  console.log(colors.blue(`88888P"   "Y88888 888  "Y88888 888  "Y8888  888`));
  console.log("");
}

async function printWelcomeMessage() {
  const packageJson = await getPackageJson();

  console.log(
    colors.cyan(
      `${emoji("👷 ")}Welcome to ${packageJson.name} v${
        packageJson.version
      }${emoji(" 👷‍")}‍\n`
    )
  );
}

async function confirmProjectCreation() {
  const { default: inquirer } = await import("inquirer");
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

async function copySampleProject(projectRoot: string) {
  const fsExtra = await import("fs-extra");
  const packageRoot = await getPackageRoot();

  await fsExtra.ensureDir(projectRoot);
  await fsExtra.copy(path.join(packageRoot, "sample-project"), projectRoot);

  // This is just in case we have been using the sample project for dev/testing
  await removeTempFilesIfPresent(projectRoot);

  await fsExtra.remove(path.join(projectRoot, "LICENSE.md"));
}

async function addGitIgnore(projectRoot: string) {
  const fsExtra = await import("fs-extra");
  const gitIgnorePath = path.join(projectRoot, ".gitignore");

  let content = await getRecommendedGitIgnore();

  if (await fsExtra.pathExists(gitIgnorePath)) {
    const existingContent = await fsExtra.readFile(gitIgnorePath, "utf-8");
    content = existingContent + "\n" + content;
  }

  await fsExtra.writeFile(gitIgnorePath, content);
}

async function addGitAttributes(projectRoot: string) {
  const fsExtra = await import("fs-extra");
  const gitAttributesPath = path.join(projectRoot, ".gitattributes");
  let content = "*.sol linguist-language=Solidity";

  if (await fsExtra.pathExists(gitAttributesPath)) {
    const existingContent = await fsExtra.readFile(gitAttributesPath, "utf-8");

    if (existingContent.includes(content)) {
      return;
    }

    content = existingContent + "\n" + content;
  }

  await fsExtra.writeFile(gitAttributesPath, content);
}

function printSuggestedCommands() {
  console.log(`Try running running the following tasks:`);
  console.log(`  buidler compile`);
  console.log(`  buidler test`);
  console.log(`  buidler deploy`);
  console.log(`  node scripts/scripted-deployment.js`);
  console.log(`  buidler help`);
}

export async function createProject() {
  const { default: inquirer } = await import("inquirer");
  printAsciiLogo();

  await printWelcomeMessage();

  const shouldCreateProject = await confirmProjectCreation();

  if (!shouldCreateProject) {
    return;
  }

  const {
    projectRoot,
    shouldAddGitIgnore,
    shouldAddGitAttributes
  } = await inquirer.prompt([
    {
      name: "projectRoot",
      default: process.cwd(),
      message: "Buidler project root:"
    },
    {
      name: "shouldAddGitIgnore",
      type: "confirm",
      message: "Do you want to add a .gitignore?"
    },
    {
      name: "shouldAddGitAttributes",
      type: "confirm",
      message:
        "Do you want to add a .gitattributes to enable Soldity highlighting on GitHub?"
    }
  ]);

  await copySampleProject(projectRoot);

  if (shouldAddGitIgnore) {
    await addGitIgnore(projectRoot);
  }

  if (shouldAddGitAttributes) {
    await addGitAttributes(projectRoot);
  }

  console.log(colors.cyan(`\n${emoji("✨ ")}Project created${emoji(" ✨")}`));

  console.log(``);

  printSuggestedCommands();
}
