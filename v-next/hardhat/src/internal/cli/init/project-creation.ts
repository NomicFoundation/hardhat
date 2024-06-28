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

enum Action {
  CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "Create an empty hardhat.config.ts",
  QUIT = "Quit",
}

export async function createProject() {
  printAsciiLogo();

  await printWelcomeMessage();

  const action = await getAction();
  if (action === Action.QUIT) {
    return;
  }

  const packageJson = await getProjectPackageJson();
  if (packageJson === undefined) {
    await createPackageJson();
  }

  if (action === Action.CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG) {
    return createEmptyTypescriptHardhatConfig();
  }
}

async function getProjectPackageJson(): Promise<PackageJson | undefined> {
  const pathToPackageJson = path.join(process.cwd(), "package.json");

  if (!(await exists(pathToPackageJson))) {
    return undefined;
  }

  const pkg: PackageJson = await readJsonFile(pathToPackageJson);

  if (pkg.type === undefined || pkg.type !== "module") {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED);
  }

  return pkg;
}

async function createEmptyTypescriptHardhatConfig() {
  await writeEmptyHardhatConfig();

  console.log(`✨ ${chalk.cyan(`Config file created`)} ✨`);

  if (!(await isInstalled(HARDHAT_PACKAGE_NAME))) {
    console.log("");
    console.log(`You need to install hardhat locally to use it. Please run:`);
    const cmd = await getRecommendedDependenciesInstallationCommand({
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

async function getAction(): Promise<Action> {
  // If a matching ENV variable is passed, we do not prompt the user
  if (
    process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG !== undefined
  ) {
    return Action.CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG;
  }

  // No ENV variable is passed, we prompt the user
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

    const actions: Action[] = Object.values(Action);
    for (const a of actions) {
      if (a === actionResponse.action) {
        return a;
      }
    }

    throw new HardhatError(HardhatError.ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
      operation: `Responding with "${actionResponse.action}" to the project initialization wizard`,
    });
  } catch (e) {
    if (e === "") {
      // If the user cancels the prompt, we quit
      return Action.QUIT;
    }

    throw e;
  }
}

async function createPackageJson() {
  await writeJsonFile("package.json", {
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

async function writeEmptyHardhatConfig() {
  const hardhatConfigFilename = "hardhat.config.ts";
  return writeUtf8File(hardhatConfigFilename, EMPTY_HARDHAT_CONFIG);
}

async function isInstalled(dep: string) {
  const packageJson: PackageJson = await readJsonFile("package.json");

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies,
  };

  return dep in allDependencies;
}

async function getRecommendedDependenciesInstallationCommand(dependencies: {
  [name: string]: string;
}): Promise<string[]> {
  const deps = Object.entries(dependencies).map(
    ([name, version]) => `"${name}@${version}"`,
  );

  if (await isYarnProject()) {
    return ["yarn", "add", "--dev", ...deps];
  }

  if (await isPnpmProject()) {
    return ["pnpm", "add", "-D", ...deps];
  }

  return ["npm", "install", "--save-dev", ...deps];
}

async function isYarnProject() {
  return exists("yarn.lock");
}

async function isPnpmProject() {
  return exists("pnpm-lock.yaml");
}
