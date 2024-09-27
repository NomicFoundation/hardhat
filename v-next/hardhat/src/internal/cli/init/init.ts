import type { Template } from "./template.js";
import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  copy,
  ensureDir,
  exists,
  getAllFilesMatching,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { findClosestHardhatConfig } from "../../config-loading.js";
import {
  getHardhatVersion,
  getLatestHardhatVersion,
} from "../../utils/package.js";

import { HARDHAT_NAME } from "./constants.js";
import {
  getDevDependenciesInstallationCommand,
  getPackageManager,
  installsPeerDependenciesByDefault,
} from "./package-manager.js";
import {
  promptForForce,
  promptForInstall,
  promptForTemplate,
  promptForWorkspace,
} from "./prompt.js";
import { spawn } from "./subprocess.js";
import { getTemplates } from "./template.js";

export interface InitHardhatOptions {
  workspace?: string;
  template?: string;
  force?: boolean;
  install?: boolean;
}

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
    if (force === false && matchingFiles.includes(file)) {
      continue;
    }
    const pathToTemplateFile = path.join(template.path, file);
    const pathToWorkspaceFile = path.join(workspace, file);

    await ensureDir(path.dirname(pathToWorkspaceFile));
    await copy(pathToTemplateFile, pathToWorkspaceFile);
  }

  console.log(`✨ ${chalk.cyan(`Template files copied`)} ✨`);
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

  const hardhatVersion = await getHardhatVersion();
  const packageManager = await getPackageManager(workspace);

  // Find the template dev dependencies that are not already installed
  const templateDependencies = template.packageJson.devDependencies ?? {};
  // If the package manager doesn't install peer dependencies by default,
  // we need to add them to the template dependencies
  if (!(await installsPeerDependenciesByDefault(workspace, packageManager))) {
    const templatePeerDependencies =
      template.packageJson.peerDependencies ?? {};
    for (const [name, version] of Object.entries(templatePeerDependencies)) {
      templateDependencies[name] = version;
    }
  }
  const workspaceDependencies = workspacePkg.devDependencies ?? {};
  const dependenciesToInstall = Object.entries(templateDependencies)
    .filter(([name]) => workspaceDependencies[name] === undefined)
    .map(([name, version]) => {
      // If the version is workspace:, replace it with the current version of Hardhat
      if (version.startsWith("workspace:")) {
        return `"${name}@${hardhatVersion}"`;
      }
      return `"${name}@${version}"`;
    });

  // Try to install the missing dependencies if there are any
  if (Object.keys(dependenciesToInstall).length !== 0) {
    // Retrieve the package manager specific installation command
    const command = getDevDependenciesInstallationCommand(
      packageManager,
      dependenciesToInstall,
    );

    // Ask the user for permission to install the project dependencies and install them if needed
    if (install === undefined) {
      install = await promptForInstall(command);
    }

    // If the user grants permission to install the dependencies, run the installation command
    if (install) {
      await spawn(command[0], command.slice(1), {
        cwd: workspace,
        shell: true,
        stdio: "inherit",
      });

      console.log(`✨ ${chalk.cyan(`Dependencies installed`)} ✨`);
    }
  }
}

function showStarOnGitHubMessage() {
  console.log(
    chalk.cyan("Give Hardhat a star on Github if you're enjoying it! ⭐️✨"),
  );
  console.log();
  console.log(chalk.cyan("     https://github.com/NomicFoundation/hardhat"));
}
