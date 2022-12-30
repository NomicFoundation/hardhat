import chalk from "chalk";
import fsExtra from "fs-extra";
import os from "os";
import path from "path";

import { HARDHAT_NAME } from "../constants";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { getRecommendedGitIgnore } from "../core/project-structure";
import {
  hasConsentedTelemetry,
  writeTelemetryConsent,
} from "../util/global-dir";
import { fromEntries } from "../util/lang";
import { getPackageJson, getPackageRoot } from "../util/packageInfo";
import { pluralize } from "../util/strings";
import {
  confirmRecommendedDepsInstallation,
  confirmTelemetryConsent,
  confirmProjectCreation,
} from "./prompt";
import { emoji } from "./emoji";
import { Dependencies } from "./types";

enum Action {
  CREATE_JAVASCRIPT_PROJECT_ACTION = "Create a JavaScript project",
  CREATE_TYPESCRIPT_PROJECT_ACTION = "Create a TypeScript project",
  CREATE_EMPTY_HARDHAT_CONFIG_ACTION = "Create an empty hardhat.config.js",
  QUIT_ACTION = "Quit",
}

type SampleProjectTypeCreationAction =
  | Action.CREATE_JAVASCRIPT_PROJECT_ACTION
  | Action.CREATE_TYPESCRIPT_PROJECT_ACTION;

const HARDHAT_PACKAGE_NAME = "hardhat";

const PROJECT_DEPENDENCIES: Dependencies = {
  "@nomicfoundation/hardhat-toolbox": "^2.0.0",
};

const PEER_DEPENDENCIES: Dependencies = {
  hardhat: "^2.11.1",
  "@nomicfoundation/hardhat-network-helpers": "^1.0.0",
  "@nomicfoundation/hardhat-chai-matchers": "^1.0.0",
  "@nomiclabs/hardhat-ethers": "^2.0.0",
  "@nomiclabs/hardhat-etherscan": "^3.0.0",
  chai: "^4.2.0",
  ethers: "^5.4.7",
  "hardhat-gas-reporter": "^1.0.8",
  "solidity-coverage": "^0.8.0",
  "@typechain/hardhat": "^6.1.2",
  typechain: "^8.1.0",
  "@typechain/ethers-v5": "^10.1.0",
  "@ethersproject/abi": "^5.4.7",
  "@ethersproject/providers": "^5.4.7",
};

const TYPESCRIPT_DEPENDENCIES: Dependencies = {};

const TYPESCRIPT_PEER_DEPENDENCIES: Dependencies = {
  "@types/chai": "^4.2.0",
  "@types/mocha": "^9.1.0",
  "@types/node": ">=12.0.0",
  "ts-node": ">=8.0.0",
  typescript: ">=4.5.0",
};

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

  const sampleProjectName =
    projectType === Action.CREATE_JAVASCRIPT_PROJECT_ACTION
      ? "javascript"
      : "typescript";

  await fsExtra.ensureDir(projectRoot);

  const sampleProjectPath = path.join(
    packageRoot,
    "sample-projects",
    sampleProjectName
  );

  const sampleProjectRootFiles = fsExtra.readdirSync(sampleProjectPath);
  const existingFiles = sampleProjectRootFiles
    .map((f) => path.join(projectRoot, f))
    .filter((f) => fsExtra.pathExistsSync(f))
    .map((f) => path.relative(process.cwd(), f));

  if (existingFiles.length > 0) {
    const errorMsg = `We couldn't initialize the sample project because ${pluralize(
      existingFiles.length,
      "this file already exists",
      "these files already exist"
    )}: ${existingFiles.join(", ")}

Please delete or move them and try again.`;
    console.log(chalk.red(errorMsg));
    process.exit(1);
  }

  await fsExtra.copy(
    path.join(packageRoot, "sample-projects", sampleProjectName),
    projectRoot
  );

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

// exported so we can test that it uses the latest supported version of solidity
export const EMPTY_HARDHAT_CONFIG = `/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
};
`;

async function writeEmptyHardhatConfig() {
  return fsExtra.writeFile("hardhat.config.js", EMPTY_HARDHAT_CONFIG, "utf-8");
}

async function getAction(): Promise<Action> {
  if (
    process.env.HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS !== undefined
  ) {
    return Action.CREATE_JAVASCRIPT_PROJECT_ACTION;
  } else if (
    process.env.HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS !== undefined
  ) {
    return Action.CREATE_TYPESCRIPT_PROJECT_ACTION;
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

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
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

function showStarOnGitHubMessage() {
  console.log(
    chalk.cyan("Give Hardhat a star on Github if you're enjoying it!") +
      emoji(" 💞✨")
  );
  console.log();
  console.log(chalk.cyan("     https://github.com/NomicFoundation/hardhat"));
}

export function showSoliditySurveyMessage() {
  if (new Date() > new Date("2023-07-01 23:39")) {
    // the survey has finished
    return;
  }

  console.log();
  console.log(
    chalk.cyan(
      "Please take a moment to complete the 2022 Solidity Survey: https://hardhat.org/solidity-survey-2022"
    )
  );
}

export async function createProject() {
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

    console.log();
    showStarOnGitHubMessage();
    showSoliditySurveyMessage();

    return;
  }

  let responses: {
    projectRoot: string;
    shouldAddGitIgnore: boolean;
  };

  const useDefaultPromptResponses =
    process.env.HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS !== undefined ||
    process.env.HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS !== undefined;

  if (useDefaultPromptResponses) {
    responses = {
      projectRoot: process.cwd(),
      shouldAddGitIgnore: true,
    };
  } else {
    try {
      responses = await confirmProjectCreation();
    } catch (e) {
      if (e === "") {
        return;
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  const { projectRoot, shouldAddGitIgnore } = responses;

  if (shouldAddGitIgnore) {
    await addGitIgnore(projectRoot);
  }

  if (hasConsentedTelemetry() === undefined) {
    const telemetryConsent = await confirmTelemetryConsent();

    if (telemetryConsent !== undefined) {
      writeTelemetryConsent(telemetryConsent);
    }
  }

  await copySampleProject(projectRoot, action);

  let shouldShowInstallationInstructions = true;

  if (await canInstallRecommendedDeps()) {
    const dependencies = await getDependencies(action);

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
        (await confirmRecommendedDepsInstallation(
          dependenciesToInstall,
          await isYarnProject()
        ));
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
  console.log();
  console.log("See the README.md file for some example tasks you can run");
  console.log();
  showStarOnGitHubMessage();
  showSoliditySurveyMessage();
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

async function doesNpmAutoInstallPeerDependencies() {
  const { execSync } = require("child_process");
  try {
    const version: string = execSync("npm --version").toString();
    return parseInt(version.split(".")[0], 10) >= 7;
  } catch (_) {
    return false;
  }
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

async function installDependencies(
  packageManager: string,
  args: string[]
): Promise<boolean> {
  const { spawn } = await import("child_process");

  console.log(`${packageManager} ${args.join(" ")}`);

  const childProcess = spawn(packageManager, args, {
    stdio: "inherit",
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

async function getDependencies(
  projectType: SampleProjectTypeCreationAction
): Promise<Dependencies> {
  const shouldInstallPeerDependencies =
    (await isYarnProject()) || !(await doesNpmAutoInstallPeerDependencies());

  const shouldInstallTypescriptDependencies =
    projectType === Action.CREATE_TYPESCRIPT_PROJECT_ACTION;

  const shouldInstallTypescriptPeerDependencies =
    shouldInstallTypescriptDependencies && shouldInstallPeerDependencies;

  return {
    [HARDHAT_PACKAGE_NAME]: `^${(await getPackageJson()).version}`,
    ...PROJECT_DEPENDENCIES,
    ...(shouldInstallPeerDependencies ? PEER_DEPENDENCIES : {}),
    ...(shouldInstallTypescriptDependencies ? TYPESCRIPT_DEPENDENCIES : {}),
    ...(shouldInstallTypescriptPeerDependencies
      ? TYPESCRIPT_PEER_DEPENDENCIES
      : {}),
  };
}
