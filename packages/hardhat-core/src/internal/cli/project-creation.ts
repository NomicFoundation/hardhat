import chalk from "chalk";
import fsExtra from "fs-extra";
import os from "os";
import path from "path";

import { HARDHAT_NAME } from "../constants";
import { DEFAULT_SOLC_VERSION } from "../core/config/default-config";
import { getRecommendedGitIgnore } from "../core/project-structure";
import {
  hasConsentedTelemetry,
  writeTelemetryConsent,
} from "../util/global-dir";
import { fromEntries } from "../util/lang";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";

import { emoji } from "./emoji";

const CREATE_SAMPLE_PROJECT_ACTION = "Create a sample project";
const CREATE_EMPTY_HARDHAT_CONFIG_ACTION = "Create an empty hardhat.config.js";
const QUIT_ACTION = "Quit";

interface Dependencies {
  [name: string]: string;
}

const HARDHAT_PACKAGE_NAME = "hardhat";

const SAMPLE_PROJECT_DEPENDENCIES: Dependencies = {
  "@nomiclabs/hardhat-waffle": "^2.0.0",
  "ethereum-waffle": "^3.0.0",
  chai: "^4.2.0",
  "@nomiclabs/hardhat-ethers": "^2.0.0",
  ethers: "^5.0.0",
};

const TELEMETRY_CONSENT_TIMEOUT = 10000;

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

// generated with the "colossal" font
function printAsciiLogo() {
  console.log(
    chalk.blue("888    888                      888 888               888")
  );
  console.log(
    chalk.blue("888    888                      888 888               888")
  );
  console.log(
    chalk.blue("888    888                      888 888               888")
  );
  console.log(
    chalk.blue("8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888")
  );
  console.log(
    chalk.blue('888    888     "88b 888P"  d88" 888 888 "88b     "88b 888')
  );
  console.log(
    chalk.blue("888    888 .d888888 888    888  888 888  888 .d888888 888")
  );
  console.log(
    chalk.blue("888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.")
  );
  console.log(
    chalk.blue('888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888')
  );
  console.log("");
}

async function printWelcomeMessage() {
  const packageJson = await getPackageJson();

  console.log(
    chalk.cyan(
      `${emoji("👷 ")}Welcome to ${HARDHAT_NAME} v${packageJson.version}${emoji(
        " 👷‍"
      )}\n`
    )
  );
}

async function copySampleProject(projectRoot: string) {
  const packageRoot = getPackageRoot();

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

function printSuggestedCommands() {
  console.log(`Try running some of the following tasks:`);
  console.log(`  npx hardhat accounts`);
  console.log(`  npx hardhat compile`);
  console.log(`  npx hardhat test`);
  console.log(`  npx hardhat node`);
  console.log(`  node scripts/sample-script.js`);
  console.log(`  npx hardhat help`);
}

async function printRecommendedDepsInstallationInstructions() {
  console.log(
    `You need to install these dependencies to run the sample project:`
  );

  const cmd = await getRecommendedDependenciesInstallationCommand(
    await getDependencies()
  );

  console.log(`  ${cmd.join(" ")}`);
}

async function writeEmptyHardhatConfig() {
  return fsExtra.writeFile(
    "hardhat.config.js",
    `/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "${DEFAULT_SOLC_VERSION}",
};
`,
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
            name: CREATE_EMPTY_HARDHAT_CONFIG_ACTION,
            message: CREATE_EMPTY_HARDHAT_CONFIG_ACTION,
            value: CREATE_EMPTY_HARDHAT_CONFIG_ACTION,
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

    // tslint:disable-next-line only-hardhat-error
    throw e;
  }
}

async function createPackageJson() {
  await fsExtra.writeJson(
    "package.json",
    {
      name: "hardhat-project",
    },
    { spaces: 2 }
  );
}

export async function createProject() {
  const { default: enquirer } = await import("enquirer");
  printAsciiLogo();

  await printWelcomeMessage();

  const action = await getAction();

  if (action === QUIT_ACTION) {
    return;
  }

  if (!(await fsExtra.pathExists("package.json"))) {
    await createPackageJson();
  }

  if (action === CREATE_EMPTY_HARDHAT_CONFIG_ACTION) {
    await writeEmptyHardhatConfig();
    console.log(
      `${emoji("✨ ")}${chalk.cyan(`Config file created`)}${emoji(" ✨")}`
    );

    if (!isInstalled(HARDHAT_PACKAGE_NAME)) {
      console.log("");
      console.log(`You need to install hardhat locally to use it. Please run:`);
      const cmd = await getRecommendedDependenciesInstallationCommand({
        [HARDHAT_PACKAGE_NAME]: `^${(await getPackageJson()).version}`,
      });

      console.log("");
      console.log(cmd.join(" "));
      console.log("");
    }

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
        message: "Hardhat project root:",
      },
      createConfirmationPrompt(
        "shouldAddGitIgnore",
        "Do you want to add a .gitignore?"
      ),
    ]);
  } catch (e) {
    if (e === "") {
      return;
    }

    // tslint:disable-next-line only-hardhat-error
    throw e;
  }

  const { projectRoot, shouldAddGitIgnore } = responses;

  await copySampleProject(projectRoot);

  if (shouldAddGitIgnore) {
    await addGitIgnore(projectRoot);
  }

  if (hasConsentedTelemetry() === undefined) {
    const telemetryConsent = await confirmTelemetryConsent();

    if (telemetryConsent !== undefined) {
      writeTelemetryConsent(telemetryConsent);
    }
  }

  let shouldShowInstallationInstructions = true;

  if (await canInstallRecommendedDeps()) {
    const dependencies = await getDependencies();

    const recommendedDeps = Object.keys(dependencies);

    const dependenciesToInstall = fromEntries(
      Object.entries(dependencies).filter(([name]) => !isInstalled(name))
    );

    const installedRecommendedDeps = recommendedDeps.filter(isInstalled);
    const installedExceptHardhat = installedRecommendedDeps.filter(
      (name) => name !== HARDHAT_PACKAGE_NAME
    );

    if (installedRecommendedDeps.length === recommendedDeps.length) {
      shouldShowInstallationInstructions = false;
    } else if (installedExceptHardhat.length === 0) {
      const shouldInstall = await confirmRecommendedDepsInstallation(
        dependenciesToInstall
      );
      if (shouldInstall) {
        const installed = await installRecommendedDependencies(
          dependenciesToInstall
        );

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

async function installRecommendedDependencies(dependencies: Dependencies) {
  console.log("");

  // The reason we don't quote the dependencies here is because they are going
  // to be used in child_process.sapwn, which doesn't require escaping string,
  // and can actually fail if you do.
  const installCmd = await getRecommendedDependenciesInstallationCommand(
    dependencies,
    false
  );
  return installDependencies(installCmd[0], installCmd.slice(1));
}

async function confirmRecommendedDepsInstallation(
  depsToInstall: Dependencies
): Promise<boolean> {
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
          depsToInstall
        ).join(" ")})?`
      ),
    ]);
  } catch (e) {
    if (e === "") {
      return false;
    }

    // tslint:disable-next-line only-hardhat-error
    throw e;
  }

  return responses.shouldInstallPlugin;
}

export async function confirmTelemetryConsent(): Promise<boolean | undefined> {
  const enquirer = require("enquirer");

  const prompt = new enquirer.prompts.Confirm({
    name: "telemetryConsent",
    type: "confirm",
    initial: true,
    message:
      "Help us improve Hardhat with anonymous crash reports & basic usage data?",
  });

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(resolve, TELEMETRY_CONSENT_TIMEOUT);
  });

  const result = await Promise.race([prompt.run(), timeoutPromise]);

  clearTimeout(timeout);
  if (result === undefined) {
    await prompt.cancel();
  }

  return result;
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

async function getRecommendedDependenciesInstallationCommand(
  dependencies: Dependencies,
  quoteDependencies = true
): Promise<string[]> {
  const deps = Object.entries(dependencies).map(([name, version]) =>
    quoteDependencies ? `"${name}@${version}"` : `${name}@${version}`
  );

  if (await isYarnProject()) {
    return ["yarn", "add", "--dev", ...deps];
  }

  return ["npm", "install", "--save-dev", ...deps];
}

async function getDependencies() {
  return {
    [HARDHAT_PACKAGE_NAME]: `^${(await getPackageJson()).version}`,
    ...SAMPLE_PROJECT_DEPENDENCIES,
  };
}
