import colors from "ansi-colors";
import fsExtra from "fs-extra";
import path from "path";

import { BUIDLER_NAME } from "../constants";
import { getRecommendedGitIgnore } from "../core/project-structure";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";

import { emoji } from "./emoji";

const CREATE_SAMPLE_PROJECT_ACTION = "Create a sample project";
const CREATE_EMPTY_BUIDLER_CONFIG_ACTION = "Create an empty buidler.config.js";
const QUIT_ACTION = "Quit";

async function removeProjectDirIfPresent(projectRoot: string, dirName: string) {
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
      `${emoji("👷 ")}Welcome to ${BUIDLER_NAME} v${packageJson.version}${emoji(
        " 👷‍"
      )}‍\n`
    )
  );
}

async function copySampleProject(projectRoot: string) {
  const packageRoot = await getPackageRoot();

  await fsExtra.ensureDir(projectRoot);
  await fsExtra.copy(path.join(packageRoot, "sample-project"), projectRoot);

  // This is just in case we have been using the sample project for dev/testing
  await removeTempFilesIfPresent(projectRoot);

  await fsExtra.remove(path.join(projectRoot, "LICENSE.md"));
}

async function addGitIgnore(projectRoot: string) {
  const gitIgnorePath = path.join(projectRoot, ".gitignore");

  let content = await getRecommendedGitIgnore();

  if (await fsExtra.pathExists(gitIgnorePath)) {
    const existingContent = await fsExtra.readFile(gitIgnorePath, "utf-8");
    content = existingContent + "\n" + content;
  }

  await fsExtra.writeFile(gitIgnorePath, content);
}

async function addGitAttributes(projectRoot: string) {
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
  console.log(`Try running some of the following tasks:`);
  console.log(`  buidler accounts`);
  console.log(`  buidler compile`);
  console.log(`  buidler test`);
  console.log(`  node scripts/sample-script.js`);
  console.log(`  buidler help`);
}

function printSuggestedPlugins() {
  console.log(``);
  console.log(`Try installing some plugins:`);
  console.log(`  https://github.com/nomiclabs/buidler-truffle5`);
  console.log(`  https://github.com/nomiclabs/buidler-web3`);
  console.log(`  https://github.com/nomiclabs/buidler-ethers`);
  console.log(``);
}

async function writeEmptyBuidlerConfig() {
  return fsExtra.writeFile(
    "buidler.config.js",
    "module.exports = {};\n",
    "utf-8"
  );
}

async function getAction() {
  const { default: enquirer } = await import("enquirer");
  const actionResponse = await enquirer.prompt<{ action: string }>([
    {
      name: "action",
      type: "select",
      message: "What do you want to do?",
      initial: 0,
      choices: [
        {
          name: CREATE_SAMPLE_PROJECT_ACTION,
          message: CREATE_SAMPLE_PROJECT_ACTION,
          value: CREATE_SAMPLE_PROJECT_ACTION
        },
        {
          name: CREATE_EMPTY_BUIDLER_CONFIG_ACTION,
          message: CREATE_EMPTY_BUIDLER_CONFIG_ACTION,
          value: CREATE_EMPTY_BUIDLER_CONFIG_ACTION
        },
        { name: QUIT_ACTION, message: QUIT_ACTION, value: QUIT_ACTION }
      ]
    }
  ]);

  return actionResponse.action;
}

export async function createProject() {
  const { default: enquirer } = await import("enquirer");
  printAsciiLogo();

  await printWelcomeMessage();

  const action = await getAction();

  if (action === QUIT_ACTION) {
    return;
  }

  if (action === CREATE_EMPTY_BUIDLER_CONFIG_ACTION) {
    await writeEmptyBuidlerConfig();
    console.log(
      colors.cyan(`${emoji("✨ ")}Config file created${emoji(" ✨")}`)
    );
    return;
  }

  let responses: {
    projectRoot: string;
    shouldAddGitIgnore: boolean;
    shouldAddGitAttributes: boolean;
  };

  try {
    responses = await enquirer.prompt<typeof responses>([
      {
        name: "projectRoot",
        type: "input",
        initial: process.cwd(),
        message: "Buidler project root:"
      },
      createConfirmationPrompt(
        "shouldAddGitIgnore",
        "Do you want to add a .gitignore?"
      ),
      createConfirmationPrompt(
        "shouldAddGitAttributes",
        "Do you want to add a .gitattributes to enable Soldity highlighting on GitHub?"
      )
    ]);
  } catch (e) {
    if (e === "") {
      return;
    }

    // tslint:disable-next-line only-buidler-error
    throw e;
  }

  const { projectRoot, shouldAddGitIgnore, shouldAddGitAttributes } = responses;

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
  printSuggestedPlugins();
}

function createConfirmationPrompt(name: string, message: string) {
  return {
    type: "confirm",
    name,
    message,
    initial: "y",
    default: "(Y/n)",
    isTrue(input: string | boolean) {
      if (typeof input === "string") {
        return input.toLowerCase() === "y";
      }

      return input;
    },
    isFalse(input: string | boolean) {
      if (typeof input === "string") {
        return input.toLowerCase() === "n";
      }

      return input;
    },
    format(): string {
      const that = this as any;
      const value = that.value === true ? "y" : "n";

      if (that.state.submitted === true) {
        return that.styles.submitted(value);
      }

      return value;
    }
  };
}
