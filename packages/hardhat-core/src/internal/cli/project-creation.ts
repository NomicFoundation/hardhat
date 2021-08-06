import chalk from "chalk";
import fsExtra from "fs-extra";
import os from "os";
import path from "path";

import { HARDHAT_NAME } from "../constants";
import { DEFAULT_SOLC_VERSION } from "../core/config/default-config";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { getRecommendedGitIgnore } from "../core/project-structure";
import {
  hasConsentedTelemetry,
  writeTelemetryConsent,
} from "../util/global-dir";
import { fromEntries } from "../util/lang";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";

import { emoji } from "./emoji";

enum Action {
  CREATE_BASIC_SAMPLE_PROJECT_ACTION = "Create a basic sample project",
  CREATE_ADVANCED_SAMPLE_PROJECT_ACTION = "Create an advanced sample project",
  CREATE_EMPTY_HARDHAT_CONFIG_ACTION = "Create an empty hardhat.config.js",
  QUIT_ACTION = "Quit",
}

type SampleProjectTypeCreationAction =
  | Action.CREATE_BASIC_SAMPLE_PROJECT_ACTION
  | Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION;

interface Dependencies {
  [name: string]: string;
}

const HARDHAT_PACKAGE_NAME = "hardhat";

const BASIC_SAMPLE_PROJECT_DEPENDENCIES: Dependencies = {
  "@nomiclabs/hardhat-waffle": "^2.0.0",
  "ethereum-waffle": "^3.0.0",
  chai: "^4.2.0",
  "@nomiclabs/hardhat-ethers": "^2.0.0",
  ethers: "^5.0.0",
};

const ADVANCED_SAMPLE_PROJECT_DEPENDENCIES: Dependencies = {
  ...BASIC_SAMPLE_PROJECT_DEPENDENCIES,
  "@nomiclabs/hardhat-etherscan": "^2.1.3",
  dotenv: "^10.0.0",
  eslint: "^7.29.0",
  "eslint-config-prettier": "^8.3.0",
  "eslint-config-standard": "^16.0.3",
  "eslint-plugin-import": "^2.23.4",
  "eslint-plugin-node": "^11.1.0",
  "eslint-plugin-prettier": "^3.4.0",
  "eslint-plugin-promise": "^5.1.0",
  "hardhat-gas-reporter": "^1.0.4",
  prettier: "^2.3.2",
  "prettier-plugin-solidity": "^1.0.0-beta.13",
  solhint: "^3.3.6",
  "solidity-coverage": "^0.7.16",
};

const SAMPLE_PROJECT_DEPENDENCIES: {
  [K in SampleProjectTypeCreationAction]: Dependencies;
} = {
  [Action.CREATE_BASIC_SAMPLE_PROJECT_ACTION]: BASIC_SAMPLE_PROJECT_DEPENDENCIES,
  [Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION]: ADVANCED_SAMPLE_PROJECT_DEPENDENCIES,
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

async function copySampleProject(
  projectRoot: string,
  projectType: SampleProjectTypeCreationAction
) {
  const packageRoot = getPackageRoot();

  // first copy the basic project, then, if the advanced project is what was
  // requested, overlay the advanced files on top of the basic ones.

  await fsExtra.ensureDir(projectRoot);
  await fsExtra.copy(
    path.join(packageRoot, "sample-projects", "basic"),
    projectRoot
  );

  if (projectType === Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION) {
    await fsExtra.copy(
      path.join(packageRoot, "sample-projects", "advanced"),
      projectRoot
    );
    await fsExtra.remove(path.join(projectRoot, "scripts", "sample-script.js"));
  }

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

async function printRecommendedDepsInstallationInstructions(
  projectType: SampleProjectTypeCreationAction
) {
  console.log(
    `You need to install these dependencies to run the sample project:`
  );

  const cmd = await getRecommendedDependenciesInstallationCommand(
    await getDependencies(projectType)
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

async function getAction(): Promise<Action> {
  if (
    process.env.HARDHAT_CREATE_BASIC_SAMPLE_PROJECT_WITH_DEFAULTS !== undefined
  ) {
    return Action.CREATE_BASIC_SAMPLE_PROJECT_ACTION;
  } else if (
    process.env.HARDHAT_CREATE_ADVANCED_SAMPLE_PROJECT_WITH_DEFAULTS !==
    undefined
  ) {
    return Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION;
  }
  const { default: enquirer } = await import("enquirer");
  try {
    const actionResponse = await enquirer.prompt<{ action: string }>([
      {
        name: "action",
        type: "select",
        message: "What do you want to do?",
        initial: 0,
        choices: Object.values(Action).map((a: Action) => {
          return { name: a, message: a, value: a };
        }),
      },
    ]);

    if ((Object.values(Action) as string[]).includes(actionResponse.action)) {
      return actionResponse.action as Action;
    } else {
      throw new HardhatError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
        operation: `Responding with "${actionResponse.action}" to the project initialization wizard`,
      });
    }
  } catch (e) {
    if (e === "") {
      return Action.QUIT_ACTION;
    }

    // eslint-disable-next-line @nomiclabs/only-hardhat-error
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

  if (action === Action.QUIT_ACTION) {
    return;
  }

  if (!(await fsExtra.pathExists("package.json"))) {
    await createPackageJson();
  }

  if (action === Action.CREATE_EMPTY_HARDHAT_CONFIG_ACTION) {
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
  };

  const useDefaultPromptResponses =
    process.env.HARDHAT_CREATE_BASIC_SAMPLE_PROJECT_WITH_DEFAULTS !==
      undefined ||
    process.env.HARDHAT_CREATE_ADVANCED_SAMPLE_PROJECT_WITH_DEFAULTS !==
      undefined;

  if (useDefaultPromptResponses) {
    responses = {
      projectRoot: process.cwd(),
      shouldAddGitIgnore: true,
    };
  } else {
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

      // eslint-disable-next-line @nomiclabs/only-hardhat-error
      throw e;
    }
  }

  const { projectRoot, shouldAddGitIgnore } = responses;

  await copySampleProject(projectRoot, action);

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
    const dependencies = await getDependencies(
      action as SampleProjectTypeCreationAction /* type cast feels okay here
      because we already returned from this function if it isn't valid. */
    );

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
      const shouldInstall =
        useDefaultPromptResponses ||
        (await confirmRecommendedDepsInstallation(dependenciesToInstall));
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
    await printRecommendedDepsInstallationInstructions(action);
  }

  console.log(
    `\n${emoji("✨ ")}${chalk.cyan("Project created")}${emoji(" ✨")}`
  );

  console.log("See the README.txt file for some example tasks you can run.");
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
    // cf. https://github.com/nomiclabs/hardhat/issues/1698
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
        `Do you want to install this sample project's dependencies with ${packageManager} (${Object.keys(
          depsToInstall
        ).join(" ")})?`
      ),
    ]);
  } catch (e) {
    if (e === "") {
      return false;
    }

    // eslint-disable-next-line @nomiclabs/only-hardhat-error
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

    childProcess.once("error", (_status) => {
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

async function getDependencies(projectType: SampleProjectTypeCreationAction) {
  return {
    [HARDHAT_PACKAGE_NAME]: `^${(await getPackageJson()).version}`,
    ...SAMPLE_PROJECT_DEPENDENCIES[projectType],
  };
}
