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
  readdir,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { getHardhatVersion } from "../../utils/package.js";

import { HARDHAT_NAME } from "./constants.js";
import { findClosestHardhatConfig } from "../../config-loading.js";

export interface CreateProjectOptions {
  workspace?: string;
  template?: string;
  force?: boolean;
  install?: boolean;
}

interface Template {
  name: string;
  packageJson: PackageJson;
  path: string;
  files: string[];
}

export async function createProject(
  options?: CreateProjectOptions,
): Promise<void> {
  try {
    printAsciiLogo();

    await printWelcomeMessage();

    const workspace = await getWorkspace(options?.workspace);
    await throwIfWorkspaceAlreadyInsideProject(workspace);

    const template = await getTemplate(options?.template);

    const packageJson = await getProjectPackageJson(workspace);
    if (packageJson === undefined) {
      await createPackageJson(workspace);
    }

    return createProjectFromTemplate(
      workspace,
      template,
      options?.force,
      options?.install,
    );
  } catch (e) {
    if (e === "") {
      // If the user cancels any prompt, we quit silently
      return;
    }

    throw e;
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

async function createProjectFromTemplate(
  workspace: string,
  template: Template,
  force?: boolean,
  install?: boolean,
) {
  const pathToWorkspacePackageJson = path.join(workspace, "package.json");

  if (!(await exists(pathToWorkspacePackageJson))) {
    throw new PackageJsonNotFoundError(pathToWorkspacePackageJson);
  }

  const workspaceFiles = await getAllFilesMatching(workspace).then((files) =>
    files.map((f) => path.relative(workspace, f)),
  );

  const existingFiles = template.files.filter((f) =>
    workspaceFiles.includes(f),
  );

  if (existingFiles.length !== 0) {
    if (force === undefined) {
      const { default: enquirer } = await import("enquirer");

      const forceResponse = await enquirer.prompt<{ force: boolean }>([
        {
          name: "force",
          type: "confirm",
          message: `The following files already exist in the workspace:\n${existingFiles.map((f) => `- ${f}`).join("\n")}\n\nDo you want to overwrite them?`,
          initial: false,
        },
      ]);

      force = forceResponse.force;
    }
  }

  for (const file of template.files) {
    if (!force && workspaceFiles.includes(file)) {
      continue;
    }
    const pathToTemplateFile = path.join(template.path, file);
    const pathToWorkspaceFile = path.join(workspace, file);

    await ensureDir(path.dirname(pathToWorkspaceFile));
    await copy(pathToTemplateFile, pathToWorkspaceFile);
  }

  console.log(`✨ ${chalk.cyan(`Config file created`)} ✨`);

  const workspacePkg: PackageJson = await readJsonFile(
    pathToWorkspacePackageJson,
  );

  const dependencies = getDependenciesDiff(
    template.packageJson.dependencies ?? {},
    workspacePkg.dependencies ?? {},
  );
  const devDependencies = getDependenciesDiff(
    template.packageJson.devDependencies ?? {},
    workspacePkg.devDependencies ?? {},
  );
  const peerDependencies = getDependenciesDiff(
    template.packageJson.peerDependencies ?? {},
    workspacePkg.peerDependencies ?? {},
  );
  const optionalDependencies = getDependenciesDiff(
    template.packageJson.optionalDependencies ?? {},
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

    if (install === undefined) {
      const { default: enquirer } = await import("enquirer");

      const installResponse = await enquirer.prompt<{ install: boolean }>([
        {
          name: "install",
          type: "confirm",
          message: `You need to install the project dependencies using the following command${commands.length === 1 ? "" : "s"}:\n${commands.map((c) => c.join(" ")).join("\n")}\n\nDo you want to run them now?`,
          initial: false,
        },
      ]);

      install = installResponse.install;
    }

    if (install) {
      const { spawn } = await import("child_process");
      for (const command of commands) {
        console.log(command.join(" "));
        const child = spawn(command[0], command.slice(1), {
          cwd: workspace,
          shell: true,
          stdio: "inherit",
        });
        await new Promise<void>((resolve, reject) => {
          child.on("close", (code) => {
            if (code !== 0) {
              reject(
                new Error(
                  `Command "${command.join(" ")}" exited with code ${code}`,
                ),
              );
            }
            resolve();
          });
        });
      }
    }
  }

  showStarOnGitHubMessage();
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

async function getTemplates(): Promise<Template[]> {
  const packageRoot = await findClosestPackageRoot(import.meta.url);
  const pathToTemplates = path.join(packageRoot, "templates");

  if (!(await exists(pathToTemplates))) {
    return [];
  }

  const pathsToTemplates = await readdir(pathToTemplates);

  return await Promise.all(
    pathsToTemplates.map(async (name) => {
      const pathToTemplate = path.join(pathToTemplates, name);
      const pathToPackageJson = path.join(pathToTemplate, "package.json");

      if (!(await exists(pathToPackageJson))) {
        throw new PackageJsonNotFoundError(pathToPackageJson);
      }

      const packageJson: PackageJson =
        await readJsonFile<PackageJson>(pathToPackageJson);
      const files = await getAllFilesMatching(pathToTemplate, (f) => {
        // Ignore the package.json file because it is handled separately
        if (f === pathToPackageJson) {
          return false;
        }
        // We should ignore all the files according to the .gitignore rules
        // However, for simplicity, we just ignore the node_modules folder
        // If we needed to implement a more complex ignore logic, we could
        // use recently introduced glob from node:fs/promises
        if (
          path.relative(pathToTemplate, f).split(path.sep)[0] === "node_modules"
        ) {
          return false;
        }
        return true;
      }).then((files) => files.map((f) => path.relative(pathToTemplate, f)));

      return {
        name,
        packageJson,
        path: pathToTemplate,
        files,
      };
    }),
  );
}

async function getTemplate(template?: string): Promise<Template> {
  const templates = await getTemplates();

  if (template === undefined) {
    const { default: enquirer } = await import("enquirer");

    const templateResponse = await enquirer.prompt<{ template: string }>([
      {
        name: "template",
        type: "select",
        message: "What type of project would you like to initialize?",
        initial: 0,
        choices: templates.map((template) => ({
          name: template.name,
          message: template.packageJson.description,
          value: template.name,
        })),
      },
    ]);

    template = templateResponse.template;
  }

  for (const t of templates) {
    if (t.name === template) {
      return t;
    }
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
    operation: `Responding with "${template}" to the project initialization wizard`,
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
