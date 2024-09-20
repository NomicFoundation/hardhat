import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  readJsonFile,
  writeJsonFile,
  writeUtf8File,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { getHardhatVersion } from "../../utils/package.js";

import { HARDHAT_NAME, HARDHAT_PACKAGE_NAME } from "./constants.js";
import { EMPTY_HARDHAT_CONFIG } from "./sample-config-file.js";
import { findClosestHardhatConfig } from "../../config-loading.js";

export enum Action {
  CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "Create an empty hardhat.config.ts",
  QUIT = "Quit",
}

export interface CreateProjectOptions {
  workspace?: string;
  action?: string;
}

export async function createProject(
  options?: CreateProjectOptions,
): Promise<void> {
  printAsciiLogo();

  await printWelcomeMessage();

  const workspace = await getWorkspace(options?.workspace);
  await throwIfWorkspaceAlreadyInsideProject(workspace);

  const action = await getAction(options?.action);

  if (action === Action.QUIT) {
    return;
  }

  const packageJson = await getProjectPackageJson(workspace);
  if (packageJson === undefined) {
    await createPackageJson(workspace);
  }

  if (action === Action.CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG) {
    return createEmptyTypescriptHardhatConfig(workspace);
  }
}

async function getProjectPackageJson(
  workspace: string,
): Promise<PackageJson | undefined> {
  const pathToPackageJson = path.join(workspace, "package.json");

  if (!(await exists(pathToPackageJson))) {
    return undefined;
  }

  const pkg: PackageJson = await readJsonFile(pathToPackageJson);

  if (pkg.type === undefined || pkg.type !== "module") {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED);
  }

  return pkg;
}

async function createEmptyTypescriptHardhatConfig(workspace: string) {
  await writeEmptyHardhatConfig(workspace);

  console.log(`✨ ${chalk.cyan(`Config file created`)} ✨`);

  if (!(await isInstalled(workspace, HARDHAT_PACKAGE_NAME))) {
    console.log("");
    console.log(`You need to install hardhat locally to use it. Please run:`);
    const cmd = await getRecommendedDependenciesInstallationCommand(workspace, {
      [HARDHAT_PACKAGE_NAME]: `^${await getHardhatVersion()}`,
    });

    console.log("");
    console.log(cmd.join(" "));
    console.log("");
  }

  console.log();

  showStarOnGitHubMessage();

  return;
}

// generated with the "colossal" font
function printAsciiLogo() {
  const logoLines = `
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888
`.trim();

  console.log(chalk.blue(logoLines));
}

async function printWelcomeMessage() {
  console.log(
    chalk.cyan(
      `👷 Welcome to ${HARDHAT_NAME} v${await getHardhatVersion()} 👷\n`,
    ),
  );
}

async function getWorkspace(workspace?: string): Promise<string> {
  if (workspace === undefined) {
    return process.cwd();
  }

  return path.resolve(workspace);
}

async function throwIfWorkspaceAlreadyInsideProject(workspace: string) {
  try {
    const configFilePath = await findClosestHardhatConfig(workspace);

    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: configFilePath,
      },
    );
  } catch (err) {
    if (
      HardhatError.isHardhatError(err) &&
      err.number === HardhatError.ERRORS.GENERAL.NO_CONFIG_FILE_FOUND.number
    ) {
      // If a configuration file is not found, it is possible to initialize a new project,
      // hence continuing code execution
      return;
    }

    throw err;
  }
}

async function getAction(action?: string): Promise<Action> {
  if (action === undefined) {
    try {
      const { default: enquirer } = await import("enquirer");

      const actionResponse = await enquirer.prompt<{ action: string }>([
        {
          name: "action",
          type: "select",
          message: "What do you want to do?",
          initial: 0,
          choices: Object.values(Action).map((a: Action) => {
            return {
              name: a,
              message: a,
              value: a,
            };
          }),
        },
      ]);

      action = actionResponse.action;
    } catch (e) {
      if (e === "") {
        // If the user cancels the prompt, we quit
        return Action.QUIT;
      }

      throw e;
    }
  }

  const actions: Action[] = Object.values(Action);
  for (const a of actions) {
    if (a === action) {
      return a;
    }
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
    operation: `Responding with "${action}" to the project initialization wizard`,
  });
}

async function createPackageJson(workspace: string) {
  const pathToPackageJson = path.join(workspace, "package.json");

  await writeJsonFile(pathToPackageJson, {
    name: "hardhat-project",
    type: "module",
  });
}

function showStarOnGitHubMessage() {
  console.log(
    chalk.cyan("Give Hardhat a star on Github if you're enjoying it! ⭐️✨"),
  );
  console.log();
  console.log(chalk.cyan("     https://github.com/NomicFoundation/hardhat"));
}

async function writeEmptyHardhatConfig(workspace: string) {
  const hardhatConfigFilename = "hardhat.config.ts";
  const pathToHardhatConfig = path.join(workspace, hardhatConfigFilename);

  return writeUtf8File(pathToHardhatConfig, EMPTY_HARDHAT_CONFIG);
}

async function isInstalled(workspace: string, dep: string) {
  const pathToPackageJson = path.join(workspace, "package.json");
  const packageJson: PackageJson = await readJsonFile(pathToPackageJson);

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies,
  };

  return dep in allDependencies;
}

async function getRecommendedDependenciesInstallationCommand(
  workspace: string,
  dependencies: {
    [name: string]: string;
  },
): Promise<string[]> {
  const deps = Object.entries(dependencies).map(
    ([name, version]) => `"${name}@${version}"`,
  );

  if (await isYarnProject(workspace)) {
    return ["yarn", "add", "--dev", ...deps];
  }

  if (await isPnpmProject(workspace)) {
    return ["pnpm", "add", "-D", ...deps];
  }

  return ["npm", "install", "--save-dev", ...deps];
}

async function isYarnProject(workspace: string) {
  const pathToYarnLock = path.join(workspace, "yarn.lock");
  return exists(pathToYarnLock);
}

async function isPnpmProject(workspace: string) {
  const pathToPnpmLock = path.join(workspace, "pnpm-lock.yaml");
  return exists(pathToPnpmLock);
}
