import chalk from "chalk";
import fsExtra from "fs-extra";
import os from "os";
import path from "path";

import { BUIDLER_NAME } from "../constants";
import { ExecutionMode, getExecutionMode } from "../core/execution-mode";
import { getRecommendedGitIgnore } from "../core/project-structure";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";

import { emoji } from "./emoji";

const CREATE_SAMPLE_PROJECT_ACTION = "Create a sample project";
const CREATE_EMPTY_BUIDLER_CONFIG_ACTION = "Create an empty buidler.config.js";
const QUIT_ACTION = "Quit";

const SAMPLE_PROJECT_DEPENDENCIES = {
  "@nomiclabs/buidler-waffle": "^2.0.0",
  "ethereum-waffle": "^3.0.0",
  chai: "^4.2.0",
  "@nomiclabs/buidler-ethers": "^2.0.0",
  ethers: "^5.0.0",
};

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
  const packageJson = await getPackageJson();

  console.log(
    chalk.cyan(
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
    content = `${existingContent}
${content}`;
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

    content = `${existingContent}
${content}`;
  }

  await fsExtra.writeFile(gitAttributesPath, content);
}

function printSuggestedCommands() {
  const npx =
    getExecutionMode() === ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION
      ? ""
      : "npx ";

  console.log(`Try running some of the following tasks:`);
  console.log(`  ${npx}buidler accounts`);
  console.log(`  ${npx}buidler compile`);
  console.log(`  ${npx}buidler test`);
  console.log(`  ${npx}buidler node`);
  console.log(`  node scripts/sample-script.js`);
  console.log(`  ${npx}buidler help`);
}

async function printRecommendedDepsInstallationInstructions() {
  console.log(
    `You need to install these dependencies to run the sample project:`
  );

  const cmd = await getRecommendedDependenciesInstallationCommand();

  console.log(`  ${cmd.join(" ")}`);
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
  try {
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
            value: CREATE_SAMPLE_PROJECT_ACTION,
          },
          {
            name: CREATE_EMPTY_BUIDLER_CONFIG_ACTION,
            message: CREATE_EMPTY_BUIDLER_CONFIG_ACTION,
            value: CREATE_EMPTY_BUIDLER_CONFIG_ACTION,
          },
          { name: QUIT_ACTION, message: QUIT_ACTION, value: QUIT_ACTION },
        ],
      },
    ]);

    return actionResponse.action;
  } catch (e) {
    if (e === "") {
      return QUIT_ACTION;
    }

    // tslint:disable-next-line only-buidler-error
    throw e;
  }
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
      `${emoji("✨ ")}${chalk.cyan(`Config file created`)}${emoji(" ✨")}`
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
        message: "Buidler project root:",
      },
      createConfirmationPrompt(
        "shouldAddGitIgnore",
        "Do you want to add a .gitignore?"
      ),
      createConfirmationPrompt(
        "shouldAddGitAttributes",
        "Do you want to add a .gitattributes to enable Soldity highlighting on GitHub?"
      ),
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

  let shouldShowInstallationInstructions = true;

  if (await canInstallRecommendedDeps()) {
    const recommendedDeps = Object.keys(SAMPLE_PROJECT_DEPENDENCIES);
    const installedRecommendedDeps = recommendedDeps.filter(isInstalled);

    if (installedRecommendedDeps.length === recommendedDeps.length) {
      shouldShowInstallationInstructions = false;
    } else if (installedRecommendedDeps.length === 0) {
      const shouldInstall = await confirmRecommendedDepsInstallation();
      if (shouldInstall) {
        const installed = await installRecommendedDependencies();

        if (!installed) {
          console.warn(
            chalk.red("Failed to install the sample project's dependencies")
          );
        }

        shouldShowInstallationInstructions = !installed;
      }
    }
  }

  if (shouldShowInstallationInstructions) {
    console.log(``);
    await printRecommendedDepsInstallationInstructions();
  }

  console.log(
    `\n${emoji("✨ ")}${chalk.cyan("Project created")}${emoji(" ✨")}`
  );

  console.log(``);

  printSuggestedCommands();
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
    },
  };
}

async function canInstallRecommendedDeps() {
  return (
    (await fsExtra.pathExists("package.json")) &&
    (getExecutionMode() === ExecutionMode.EXECUTION_MODE_LOCAL_INSTALLATION ||
      getExecutionMode() === ExecutionMode.EXECUTION_MODE_LINKED) &&
    // TODO: Figure out why this doesn't work on Win
    os.type() !== "Windows_NT"
  );
}

function isInstalled(dep: string) {
  const packageJson = fsExtra.readJSONSync("package.json");

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies,
  };

  return dep in allDependencies;
}

async function isYarnProject() {
  return fsExtra.pathExists("yarn.lock");
}

async function installRecommendedDependencies() {
  console.log("");
  const installCmd = await getRecommendedDependenciesInstallationCommand();
  return installDependencies(installCmd[0], installCmd.slice(1));
}

async function confirmRecommendedDepsInstallation(): Promise<boolean> {
  const { default: enquirer } = await import("enquirer");

  let responses: {
    shouldInstallPlugin: boolean;
  };

  const packageManager = (await isYarnProject()) ? "yarn" : "npm";

  try {
    responses = await enquirer.prompt<typeof responses>([
      createConfirmationPrompt(
        "shouldInstallPlugin",
        `Do you want to install the sample project's dependencies with ${packageManager} (${Object.keys(
          SAMPLE_PROJECT_DEPENDENCIES
        ).join(" ")})?`
      ),
    ]);
  } catch (e) {
    if (e === "") {
      return false;
    }

    // tslint:disable-next-line only-buidler-error
    throw e;
  }

  return responses.shouldInstallPlugin === true;
}

async function installDependencies(
  packageManager: string,
  args: string[]
): Promise<boolean> {
  const { spawn } = await import("child_process");

  console.log(`${packageManager} ${args.join(" ")}`);

  const childProcess = spawn(packageManager, args, {
    stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
  });

  return new Promise((resolve, reject) => {
    childProcess.once("close", (status) => {
      childProcess.removeAllListeners("error");

      if (status === 0) {
        resolve(true);
        return;
      }

      reject(false);
    });

    childProcess.once("error", (status) => {
      childProcess.removeAllListeners("close");
      reject(false);
    });
  });
}

async function getRecommendedDependenciesInstallationCommand(): Promise<
  string[]
> {
  const isGlobal =
    getExecutionMode() === ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION;

  const deps = Object.entries(SAMPLE_PROJECT_DEPENDENCIES).map(
    ([name, version]) => `${name}@${version}`
  );

  if (!isGlobal && (await isYarnProject())) {
    return ["yarn", "add", "--dev", ...deps];
  }

  const npmInstall = ["npm", "install"];

  if (isGlobal) {
    npmInstall.push("--global");
  }

  return [...npmInstall, "--save-dev", ...deps];
}
