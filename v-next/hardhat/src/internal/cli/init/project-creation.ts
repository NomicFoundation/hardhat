import {
  findClosestPackageRoot,
  PackageJsonNotFoundError,
  type PackageJson,
} from "@ignored/hardhat-vnext-utils/package";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  copy,
  ensureDir,
  exists,
  getAllFilesMatching,
  isDirectory,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { getHardhatVersion } from "../../utils/package.js";

import { HARDHAT_NAME } from "./constants.js";
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
  const template = "empty-typescript";

  const packageRoot = await findClosestPackageRoot(import.meta.url);
  const pathToTemplate = path.join(packageRoot, "templates", template);

  if (!(await exists(pathToTemplate)) || !(await isDirectory(pathToTemplate))) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.TEMPLATE_NOT_FOUND, {
      template,
    });
  }

  const pathToTemplatePackageJson = path.join(pathToTemplate, "package.json");
  const pathToWorkspacePackageJson = path.join(workspace, "package.json");

  if (!(await exists(pathToTemplatePackageJson))) {
    throw new PackageJsonNotFoundError(pathToTemplatePackageJson);
  }
  if (!(await exists(pathToWorkspacePackageJson))) {
    throw new PackageJsonNotFoundError(pathToWorkspacePackageJson);
  }

  const templateFiles = await getAllFilesMatching(pathToTemplate).then(
    (files) =>
      files
        .map((f) => path.relative(pathToTemplate, f))
        .filter((f) => f !== "package.json"),
  );
  const workspaceFiles = await (
    await getAllFilesMatching(workspace)
  ).map((f) => path.relative(workspace, f));

  for (const file of templateFiles) {
    if (workspaceFiles.includes(file)) {
      console.log(
        `Skipping ${file} because it already exists in the workspace`,
      );
      continue;
    }
    const pathToTemplateFile = path.join(pathToTemplate, file);
    const pathToWorkspaceFile = path.join(workspace, file);

    await ensureDir(path.dirname(pathToWorkspaceFile));
    await copy(pathToTemplateFile, pathToWorkspaceFile);
  }

  console.log(`✨ ${chalk.cyan(`Config file created`)} ✨`);

  const templatePkg: PackageJson = await readJsonFile(
    pathToTemplatePackageJson,
  );
  const workspacePkg: PackageJson = await readJsonFile(
    pathToWorkspacePackageJson,
  );

  const dependencies = getDependenciesDiff(
    templatePkg.dependencies ?? {},
    workspacePkg.dependencies ?? {},
  );
  const devDependencies = getDependenciesDiff(
    templatePkg.devDependencies ?? {},
    workspacePkg.devDependencies ?? {},
  );
  const peerDependencies = getDependenciesDiff(
    templatePkg.peerDependencies ?? {},
    workspacePkg.peerDependencies ?? {},
  );
  const optionalDependencies = getDependenciesDiff(
    templatePkg.optionalDependencies ?? {},
    workspacePkg.optionalDependencies ?? {},
  );

  if (
    hasAnyDependencies(dependencies) ||
    hasAnyDependencies(devDependencies) ||
    hasAnyDependencies(peerDependencies) ||
    hasAnyDependencies(optionalDependencies)
  ) {
    const commands = [];
    if (hasAnyDependencies(dependencies)) {
      commands.push(
        await getDependenciesInstallationCommand(
          workspace,
          dependencies,
          "dependencies",
        ),
      );
    }
    if (hasAnyDependencies(devDependencies)) {
      commands.push(
        await getDependenciesInstallationCommand(
          workspace,
          devDependencies,
          "devDependencies",
        ),
      );
    }
    if (hasAnyDependencies(peerDependencies)) {
      commands.push(
        await getDependenciesInstallationCommand(
          workspace,
          peerDependencies,
          "peerDependencies",
        ),
      );
    }
    if (hasAnyDependencies(optionalDependencies)) {
      commands.push(
        await getDependenciesInstallationCommand(
          workspace,
          optionalDependencies,
          "optionalDependencies",
        ),
      );
    }

    console.log("");
    console.log(`You need to install hardhat locally to use it. Please run:`);
    console.log("");
    console.log(commands.map((c) => c.join(" ")).join("\n"));
    console.log("");
  }

  console.log("");

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
    const { default: enquirer } = await import("enquirer");

    const workspaceResponse = await enquirer.prompt<{ workspace: string }>([
      {
        name: "workspace",
        type: "input",
        message: "Where would you like to initialize the project?",
        initial: process.cwd(),
      },
    ]);

    workspace = workspaceResponse.workspace;
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

function hasAnyDependencies(dependencies: Record<string, string>): boolean {
  return Object.keys(dependencies).length > 0;
}

function getDependenciesDiff(
  a: Record<string, string>,
  b: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(a).filter(([k]) => b[k] === undefined),
  );
}

async function getDependenciesInstallationCommand(
  workspace: string,
  dependencies: Record<string, string>,
  type: string,
): Promise<string[]> {
  const hardhatVersion = await getHardhatVersion();

  const deps = Object.entries(dependencies).map(([name, version]) => {
    if (version.startsWith("workspace:")) {
      return `"${name}@${hardhatVersion}"`;
    }
    return `"${name}@${version}"`;
  });

  if (await isYarnProject(workspace)) {
    const command = ["yarn", "add"];

    if (type === "devDependencies") {
      command.push("--dev");
    }
    if (type === "peerDependencies") {
      command.push("--peer");
    }
    if (type === "optionalDependencies") {
      command.push("--optional");
    }

    command.push(...deps);

    return command;
  }

  if (await isPnpmProject(workspace)) {
    const command = ["pnpm", "add"];

    if (type === "devDependencies") {
      command.push("-D");
    }
    if (type === "peerDependencies") {
      command.push("-P");
    }
    if (type === "optionalDependencies") {
      command.push("-O");
    }

    command.push(...deps);

    return command;
  }

  const command = ["npm", "install"];

  if (type === "devDependencies") {
    command.push("--save-dev");
  }
  if (type === "peerDependencies") {
    command.push("--save-peer");
  }
  if (type === "optionalDependencies") {
    command.push("--save-optional");
  }

  command.push(...deps);

  return command;
}

async function isYarnProject(workspace: string) {
  const pathToYarnLock = path.join(workspace, "yarn.lock");
  return exists(pathToYarnLock);
}

async function isPnpmProject(workspace: string) {
  const pathToPnpmLock = path.join(workspace, "pnpm-lock.yaml");
  return exists(pathToPnpmLock);
}
