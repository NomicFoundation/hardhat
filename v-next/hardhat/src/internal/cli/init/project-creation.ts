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

type PackageManager = "npm" | "yarn" | "pnpm";

const packageJsonDependencyKeys = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;
const packageManagerDependencyInstallationCommands = {
  npm: {
    dependencies: ["npm", "install"],
    devDependencies: ["npm", "install", "--save-dev"],
    peerDependencies: ["npm", "install", "--save-peer"],
    optionalDependencies: ["npm", "install", "--save-optional"],
  },
  yarn: {
    dependencies: ["yarn", "add"],
    devDependencies: ["yarn", "add", "--dev"],
    peerDependencies: ["yarn", "add", "--peer"],
    optionalDependencies: ["yarn", "add", "--optional"],
  },
  pnpm: {
    dependencies: ["pnpm", "add"],
    devDependencies: ["pnpm", "add", "--save-dev"],
    peerDependencies: ["pnpm", "add", "--save-peer"],
    optionalDependencies: ["pnpm", "add", "--save-optional"],
  },
};

export async function createProject(
  options?: CreateProjectOptions,
): Promise<void> {
  try {
    printAsciiLogo();

    await printWelcomeMessage();

    const workspace = await getWorkspace(options?.workspace);

    const template = await getTemplate(options?.template);

    await ensureProjectPackageJson(workspace);

    await copyProjectFiles(workspace, template, options?.force);

    await installProjectDependencies(workspace, template, options?.install);

    showStarOnGitHubMessage();
  } catch (e) {
    if (e === "") {
      // If the user cancels any prompt, we quit silently
      return;
    }

    throw e;
  }
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
    workspace = await promptForWorkspace();
  }

  workspace = path.resolve(workspace);

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
      return workspace;
    }

    throw err;
  }
}

async function promptForWorkspace(): Promise<string> {
  const { default: enquirer } = await import("enquirer");

  const workspaceResponse = await enquirer.prompt<{ workspace: string }>([
    {
      name: "workspace",
      type: "input",
      message: "Where would you like to initialize the project?",
      initial: process.cwd(),
    },
  ]);

  return workspaceResponse.workspace;
}

async function getTemplate(template?: string): Promise<Template> {
  const templates = await getTemplates();

  if (template === undefined) {
    template = await promptForTemplate(templates);
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

async function promptForTemplate(templates: Template[]): Promise<string> {
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

  return templateResponse.template;
}

async function ensureProjectPackageJson(workspace: string): Promise<void> {
  const pathToPackageJson = path.join(workspace, "package.json");

  if (!(await exists(pathToPackageJson))) {
    await writeJsonFile(pathToPackageJson, {
      name: "hardhat-project",
      type: "module",
    });
  }

  const pkg: PackageJson = await readJsonFile(pathToPackageJson);

  if (pkg.type === undefined || pkg.type !== "module") {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED);
  }
}

async function copyProjectFiles(
  workspace: string,
  template: Template,
  force?: boolean,
) {
  const matchingFiles = await getAllFilesMatching(workspace, (file) =>
    template.files.includes(path.relative(workspace, file)),
  ).then((files) => files.map((f) => path.relative(workspace, f)));

  if (matchingFiles.length !== 0) {
    if (force === undefined) {
      force = await promptForForce(matchingFiles);
    }
  }

  for (const file of template.files) {
    if (!force && matchingFiles.includes(file)) {
      continue;
    }
    const pathToTemplateFile = path.join(template.path, file);
    const pathToWorkspaceFile = path.join(workspace, file);

    await ensureDir(path.dirname(pathToWorkspaceFile));
    await copy(pathToTemplateFile, pathToWorkspaceFile);
  }

  console.log(`✨ ${chalk.cyan(`Template files copied`)} ✨`);
}

async function promptForForce(files: string[]): Promise<boolean> {
  const { default: enquirer } = await import("enquirer");

  const forceResponse = await enquirer.prompt<{ force: boolean }>([
    {
      name: "force",
      type: "confirm",
      message: `The following files already exist in the workspace:\n${files.map((f) => `- ${f}`).join("\n")}\n\nDo you want to overwrite them?`,
      initial: false,
    },
  ]);

  return forceResponse.force;
}

async function installProjectDependencies(
  workspace: string,
  template: Template,
  install?: boolean,
) {
  const pathToWorkspacePackageJson = path.join(workspace, "package.json");

  const workspacePkg: PackageJson = await readJsonFile(
    pathToWorkspacePackageJson,
  );

  const commands = [];

  const hardhatVersion = await getHardhatVersion();
  const packageManager = await getPackageManager(workspace);

  for (const key of packageJsonDependencyKeys) {
    const templateDependencies = template.packageJson[key] ?? {};
    const workspaceDependencies = workspacePkg[key] ?? {};

    const dependenciesToInstall = Object.entries(templateDependencies)
      .filter(([name]) => workspaceDependencies[name] === undefined)
      .map(([name, version]) => {
        if (version.startsWith("workspace:")) {
          return `"${name}@${hardhatVersion}"`;
        }
        return `"${name}@${version}"`;
      });

    if (Object.keys(dependenciesToInstall).length !== 0) {
      const command =
        packageManagerDependencyInstallationCommands[packageManager][key];
      command.push(...dependenciesToInstall);
      commands.push(command);
    }
  }

  if (commands.length !== 0) {
    if (install === undefined) {
      install = await promptForInstall(commands);
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

      console.log(`✨ ${chalk.cyan(`Dependencies installed`)} ✨`);
    }
  }
}

async function getPackageManager(workspace: string): Promise<PackageManager> {
  const pathToYarnLock = path.join(workspace, "yarn.lock");
  const pathToPnpmLock = path.join(workspace, "pnpm-lock.yaml");

  if (await exists(pathToYarnLock)) {
    return "yarn";
  }
  if (await exists(pathToPnpmLock)) {
    return "pnpm";
  }
  return "npm";
}

async function promptForInstall(commands: string[][]): Promise<boolean> {
  const { default: enquirer } = await import("enquirer");

  const installResponse = await enquirer.prompt<{ install: boolean }>([
    {
      name: "install",
      type: "confirm",
      message: `You need to install the project dependencies using the following command${commands.length === 1 ? "" : "s"}:\n${commands.map((c) => c.join(" ")).join("\n")}\n\nDo you want to run them now?`,
      initial: false,
    },
  ]);

  return installResponse.install;
}

function showStarOnGitHubMessage() {
  console.log(
    chalk.cyan("Give Hardhat a star on Github if you're enjoying it! ⭐️✨"),
  );
  console.log();
  console.log(chalk.cyan("     https://github.com/NomicFoundation/hardhat"));
}
