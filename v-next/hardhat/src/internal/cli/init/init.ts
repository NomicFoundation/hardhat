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

import {
  getHardhatVersion,
  getLatestHardhatVersion,
} from "../../utils/package.js";

import { HARDHAT_NAME } from "./constants.js";
import { findClosestHardhatConfig } from "../../config-loading.js";

export interface InitHardhatOptions {
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

/**
 * initHardhat implements the project initialization wizard flow.
 *
 * It can be called with the following options:
 * - workspace: The path to the workspace to initialize the project in.
 *   If not provided, the user will be prompted to select the workspace.
 * - template: The name of the template to use for the project initialization.
 *   If not provided, the user will be prompted to select the template.
 * - force: Whether to overwrite existing files in the workspace.
 *   If not provided and there are files that would be overwritten,
 *   the user will be prompted to confirm.
 * - install: Whether to install the project dependencies.
 *   If not provided and there are dependencies that should be installed,
 *   the user will be prompted to confirm.
 *
 * The flow is as follows:
 * 1. Print the ascii logo.
 * 2. Print the welcome message.
 * 3. Optionally, ask the user for the workspace to initialize the project in.
 * 4. Optionally, ask the user for the template to use for the project initialization.
 * 5. Create the package.json file if it does not exist.
 * 6. Validate that the package.json file is an esm package.
 * 7. Optionally, ask the user if files should be overwritten.
 * 8. Copy the template files to the workspace.
 * 10. Print the commands to install the project dependencies.
 * 11. Optionally, ask the user if the project dependencies should be installed.
 * 12. Optionally, run the commands to install the project dependencies.
 * 13. Print a message to star the project on GitHub.
 */
export async function initHardhat(options?: InitHardhatOptions): Promise<void> {
  try {
    printAsciiLogo();

    await printWelcomeMessage();

    // Ask the user for the workspace to initialize the project in
    // if it was not provided, and validate that it is not already initialized
    const workspace = await getWorkspace(options?.workspace);

    // Ask the user for the template to use for the project initialization
    // if it was not provided, and validate that it exists
    const template = await getTemplate(options?.template);

    // Create the package.json file if it does not exist
    // and validate that it is an esm package
    await ensureProjectPackageJson(workspace);

    // Copy the template files to the workspace
    // Overwrite existing files only if the user opts-in to it
    await copyProjectFiles(workspace, template, options?.force);

    // Print the commands to install the project dependencies
    // Run them only if the user opts-in to it
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
  const hardhatVersion = await getHardhatVersion();
  const latestHardhatVersion = await getLatestHardhatVersion();

  console.log(
    chalk.cyan(`👷 Welcome to ${HARDHAT_NAME} v${hardhatVersion} 👷\n`),
  );

  // Warn the user if they are using an outdated version of Hardhat
  if (hardhatVersion !== latestHardhatVersion) {
    console.warn(
      chalk.yellow.bold(
        `⚠️ You are using an outdated version of Hardhat. The latest version is v${latestHardhatVersion}. Please consider upgrading to the latest version before continuing with the project initialization. ⚠️\n`,
      ),
    );
  }
}

/**
 * getWorkspace asks the user for the workspace to initialize the project in
 * if the input workspace is undefined.
 *
 * It also validates that the workspace is not already initialized.
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @returns The path to the workspace.
 */
async function getWorkspace(workspace?: string): Promise<string> {
  // Ask the user for the workspace to initialize the project in if it was not provided
  if (workspace === undefined) {
    workspace = await promptForWorkspace();
  }

  workspace = path.resolve(workspace);

  // Validate that the workspace is not already initialized
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
  ensureTTY();

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

/**
 * getTemplate asks the user for the template to use for the project initialization
 * if the input template is undefined.
 *
 * It also validates that the template exists.
 *
 * @param template The name of the template to use for the project initialization.
 * @returns
 */
async function getTemplate(template?: string): Promise<Template> {
  const templates = await getTemplates();

  // Ask the user for the template to use for the project initialization if it was not provided
  if (template === undefined) {
    template = await promptForTemplate(templates);
  }

  // Validate that the template exists
  for (const t of templates) {
    if (t.name === template) {
      return t;
    }
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
    operation: `Responding with "${template}" to the project initialization wizard`,
  });
}

/**
 * getTemplates returns the list of available templates. It retrieves them from
 * the "templates" folder in the package root.
 *
 * @returns The list of available templates.
 */
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

      // Validate that the the template has a package.json file
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
  ensureTTY();

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

/**
 * ensureProjectPackageJson creates the package.json file if it does not exist
 * in the workspace.
 *
 * It also validates that the package.json file is an esm package.
 *
 * @param workspace The path to the workspace to initialize the project in.
 */
async function ensureProjectPackageJson(workspace: string): Promise<void> {
  const pathToPackageJson = path.join(workspace, "package.json");

  // Create the package.json file if it does not exist
  if (!(await exists(pathToPackageJson))) {
    await writeJsonFile(pathToPackageJson, {
      name: "hardhat-project",
      type: "module",
    });
  }

  const pkg: PackageJson = await readJsonFile(pathToPackageJson);

  // Validate that the package.json file is an esm package
  if (pkg.type === undefined || pkg.type !== "module") {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED);
  }
}

/**
 * copyProjectFiles copies the template files to the workspace.
 *
 * If there are clashing files in the workspace, they will be overwritten only
 * if the force option is true or if the user opts-in to it.
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @param template The template to use for the project initialization.
 * @param force Whether to overwrite existing files in the workspace.
 */
async function copyProjectFiles(
  workspace: string,
  template: Template,
  force?: boolean,
) {
  // Find all the files in the workspace that would have been overwritten by the template files
  const matchingFiles = await getAllFilesMatching(workspace, (file) =>
    template.files.includes(path.relative(workspace, file)),
  ).then((files) => files.map((f) => path.relative(workspace, f)));

  // Ask the user for permission to overwrite existing files if needed
  if (matchingFiles.length !== 0) {
    if (force === undefined) {
      force = await promptForForce(matchingFiles);
    }
  }

  // Copy the template files to the workspace
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
  ensureTTY();

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

/**
 * installProjectDependencies prints the commands to install the project dependencies
 * and runs them if the install option is true or if the user opts-in to it.
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @param template The template to use for the project initialization.
 * @param install Whether to install the project dependencies.
 */
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

  // Iterate over the package.json dependency keys to find the dependencies
  // that need to be installed
  for (const key of packageJsonDependencyKeys) {
    const templateDependencies = template.packageJson[key] ?? {};
    const workspaceDependencies = workspacePkg[key] ?? {};

    const dependenciesToInstall = Object.entries(templateDependencies)
      .filter(([name]) => workspaceDependencies[name] === undefined)
      .map(([name, version]) => {
        // If the version is workspace:, replace it with the current version of Hardhat
        if (version.startsWith("workspace:")) {
          return `"${name}@${hardhatVersion}"`;
        }
        return `"${name}@${version}"`;
      });

    // If there are dependencies to install, add the package manager specific
    // installation commands to the commands array
    if (Object.keys(dependenciesToInstall).length !== 0) {
      const command =
        packageManagerDependencyInstallationCommands[packageManager][key];
      command.push(...dependenciesToInstall);
      commands.push(command);
    }
  }

  // Ask the user for permission to install the project dependencies and install them if needed
  if (commands.length !== 0) {
    if (install === undefined) {
      install = await promptForInstall(commands);
    }

    if (install) {
      for (const command of commands) {
        await runCommand(workspace, command);
      }

      console.log(`✨ ${chalk.cyan(`Dependencies installed`)} ✨`);
    }
  }
}

/**
 * getPackageManager returns the name of the package manager used in the workspace.
 * It determines this by checking the presence of package manager specific lock files.
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @returns The name of the package manager used in the workspace.
 */
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
  ensureTTY();

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

async function runCommand(cwd: string, command: string[]): Promise<void> {
  const { spawn } = await import("child_process");
  console.log(command.join(" "));
  const child = spawn(command[0], command.slice(1), {
    cwd,
    shell: true,
    stdio: "inherit",
  });
  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Command "${command.join(" ")}" exited with code ${code}`),
        );
      }
      resolve();
    });
  });
}

function showStarOnGitHubMessage() {
  console.log(
    chalk.cyan("Give Hardhat a star on Github if you're enjoying it! ⭐️✨"),
  );
  console.log();
  console.log(chalk.cyan("     https://github.com/NomicFoundation/hardhat"));
}

/**
 * ensureTTY checks if the process is running in a TTY (i.e. a terminal).
 * If it is not, it throws and error.
 */
function ensureTTY(): void {
  if (process.stdout.isTTY !== true) {
    // Many terminal emulators in windows don't present themselves as TTYs.
    // If we are in this situation we throw a special error instructing the user
    // to use WSL or powershell to initialize the project.
    if (process.platform === "win32") {
      throw new HardhatError(
        HardhatError.ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS,
      );
    }
    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL,
    );
  }
}
