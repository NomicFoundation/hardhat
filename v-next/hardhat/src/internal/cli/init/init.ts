import type { Template } from "./template.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  copy,
  ensureDir,
  exists,
  getAllFilesMatching,
  isDirectory,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";
import * as semver from "semver";

import { findClosestHardhatConfig } from "../../config-loading.js";
import { HARDHAT_NAME } from "../../constants.js";
import { getHardhatVersion } from "../../utils/package.js";
import { ensureTelemetryConsent } from "../telemetry/telemetry-permissions.js";

import {
  getDevDependenciesInstallationCommand,
  getPackageManager,
  installsPeerDependenciesByDefault,
} from "./package-manager.js";
import {
  promptForMigrateToEsm,
  promptForForce,
  promptForInstall,
  promptForTemplate,
  promptForUpdate,
  promptForWorkspace,
} from "./prompt.js";
import { spawn } from "./subprocess.js";
import { getTemplates } from "./template.js";

export interface InitHardhatOptions {
  workspace?: string;
  migrateToEsm?: boolean;
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
 * 4. Validate that the package.json exists; otherwise, create it.
 * 5. Validate that the package.json is an esm package; otherwise, ask the user if they want to set it.
 * 6. Optionally, ask the user for the template to use for the project initialization.
 * 7. Optionally, ask the user if files should be overwritten.
 * 8. Copy the template files to the workspace.
 * 9. Ensure telemetry consent.
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

    // Create the package.json file if it does not exist
    // and validate that it is an esm package
    await validatePackageJson(workspace, options?.migrateToEsm);

    // Ask the user for the template to use for the project initialization
    // if it was not provided, and validate that it exists
    const template = await getTemplate(options?.template);

    // Copy the template files to the workspace
    // Overwrite existing files only if the user opts-in to it
    await copyProjectFiles(workspace, template, options?.force);

    // Ensure telemetry consent first so that we are allowed to also track
    // the unfinished init flows
    await ensureTelemetryConsent();

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

// generated based on the "DOS Rebel" font
function printAsciiLogo() {
  const logoLines = `
 █████  █████                         ███  ███                  ███      ██████
░░███  ░░███                         ░███ ░███                 ░███     ███░░███
 ░███   ░███   ██████  ████████   ███████ ░███████    ██████  ███████  ░░░  ░███
 ░██████████  ░░░░░███░░███░░███ ███░░███ ░███░░███  ░░░░░███░░░███░      ████░
 ░███░░░░███   ███████ ░███ ░░░ ░███ ░███ ░███ ░███   ███████  ░███      ░░░░███
 ░███   ░███  ███░░███ ░███     ░███ ░███ ░███ ░███  ███░░███  ░███ ███ ███ ░███
 █████  █████░░███████ █████    ░░███████ ████ █████░░███████  ░░█████ ░░██████
░░░░░  ░░░░░  ░░░░░░░ ░░░░░      ░░░░░░░ ░░░░ ░░░░░  ░░░░░░░    ░░░░░   ░░░░░░
 `;

  // Print an ansi escape sequence to disable auto-wrapping of text in case the
  // logo doesn't fit
  process.stdout.write("\x1b[?7l");

  console.log(chalk.blue(logoLines));

  // Re-enable auto-wapping
  process.stdout.write("\x1b[?7h");
}

// NOTE: This function is exported for testing purposes
export async function printWelcomeMessage(): Promise<void> {
  const hardhatVersion = await getHardhatVersion();

  console.log(
    chalk.cyan(`👷 Welcome to ${HARDHAT_NAME} v${hardhatVersion} 👷\n`),
  );

  // TODO: Disabled this until the first release of v3
  // // Warn the user if they are using an outdated version of Hardhat
  // try {
  //   const latestHardhatVersion = await getLatestHardhatVersion();
  //   if (hardhatVersion !== latestHardhatVersion) {
  //     console.warn(
  //       chalk.yellow.bold(
  //         `⚠️ You are using an outdated version of Hardhat. The latest version is v${latestHardhatVersion}. Please consider upgrading to the latest version before continuing with the project initialization. ⚠️\n`,
  //       ),
  //     );
  //   }
  // } catch (e) {
  //   console.warn(
  //     chalk.yellow.bold(
  //       `⚠️ We couldn't check if you are using the latest version of Hardhat. Please consider upgrading to the latest version if you are not using it yet. ⚠️\n`,
  //     ),
  //   );
  // }
}

/**
 * getWorkspace asks the user for the workspace to initialize the project in
 * if the input workspace is undefined.
 *
 * It also validates that the workspace is not already initialized.
 *
 * NOTE: This function is exported for testing purposes
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @returns The path to the workspace.
 */
export async function getWorkspace(workspace?: string): Promise<string> {
  // Ask the user for the workspace to initialize the project in if it was not provided
  if (workspace === undefined) {
    workspace = await promptForWorkspace();
  }

  workspace = resolveFromRoot(process.cwd(), workspace);

  if (!(await exists(workspace)) || !(await isDirectory(workspace))) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.WORKSPACE_NOT_FOUND, {
      workspace,
    });
  }

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
 * NOTE: This function is exported for testing purposes
 *
 * @param template The name of the template to use for the project initialization.
 * @returns
 */
export async function getTemplate(template?: string): Promise<Template> {
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

  throw new HardhatError(HardhatError.ERRORS.GENERAL.TEMPLATE_NOT_FOUND, {
    template,
  });
}

/**
 * validatePackageJson creates the package.json file if it does not exist
 * in the workspace.
 *
 * It also validates that the package.json file is an esm package.
 *
 * NOTE: This function is exported for testing purposes
 *
 * @param workspace The path to the workspace to initialize the project in.
 */
export async function validatePackageJson(
  workspace: string,
  migrateToEsm?: boolean,
): Promise<void> {
  const absolutePathToPackageJson = path.join(workspace, "package.json");

  // Create the package.json file if it does not exist
  if (!(await exists(absolutePathToPackageJson))) {
    await writeJsonFile(absolutePathToPackageJson, {
      name: "hardhat-project",
      type: "module",
    });
  }

  const pkg: PackageJson = await readJsonFile(absolutePathToPackageJson);

  // Validate that the package.json file is an esm package
  if (pkg.type === "module") {
    return;
  }

  if (migrateToEsm === undefined) {
    migrateToEsm = await promptForMigrateToEsm(absolutePathToPackageJson);
  }

  if (!migrateToEsm) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED);
  }

  const packageManager = await getPackageManager(workspace);

  // We know this works with npm, pnpm, but not with yarn. If, so we use
  // pnpm or npm exclusively.
  // If you read this comment and wonder if this is outdated, you can
  // answer it by checking if the most popular versions of yarn and other
  // package managers support `<package manager> pkg set type=module`.
  const packageManagerToUse = packageManager === "pnpm" ? "pnpm" : "npm";

  await spawn(packageManagerToUse, ["pkg", "set", "type=module"], {
    cwd: workspace,
    shell: true,
    stdio: "inherit",
  });
}

/**
 * The following two functions are used to convert between relative workspace
 * and template paths. To begin with, they are used to handle the special case
 * of .gitignore.
 *
 * The reason for this is that npm ignores .gitignore files
 * during npm pack (see https://github.com/npm/npm/issues/3763). That's why when
 * we encounter a gitignore file in the template, we assume that it should be
 * called .gitignore in the workspace (and vice versa).
 *
 * They are exported for testing purposes only.
 */

export function relativeWorkspaceToTemplatePath(file: string): string {
  if (path.basename(file) === ".gitignore") {
    return path.join(path.dirname(file), "gitignore");
  }
  return file;
}
export function relativeTemplateToWorkspacePath(file: string): string {
  if (path.basename(file) === "gitignore") {
    return path.join(path.dirname(file), ".gitignore");
  }
  return file;
}

/**
 * copyProjectFiles copies the template files to the workspace.
 *
 * If there are clashing files in the workspace, they will be overwritten only
 * if the force option is true or if the user opts-in to it.
 *
 * NOTE: This function is exported for testing purposes
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @param template The template to use for the project initialization.
 * @param force Whether to overwrite existing files in the workspace.
 */
export async function copyProjectFiles(
  workspace: string,
  template: Template,
  force?: boolean,
): Promise<void> {
  // Find all the files in the workspace that would have been overwritten by the template files
  const matchingRelativeWorkspacePaths = await getAllFilesMatching(
    workspace,
    (file) => {
      const relativeWorkspacePath = path.relative(workspace, file);
      const relativeTemplatePath = relativeWorkspaceToTemplatePath(
        relativeWorkspacePath,
      );
      return template.files.includes(relativeTemplatePath);
    },
  ).then((files) => files.map((f) => path.relative(workspace, f)));

  // Ask the user for permission to overwrite existing files if needed
  if (matchingRelativeWorkspacePaths.length !== 0) {
    if (force === undefined) {
      force = await promptForForce(matchingRelativeWorkspacePaths);
    }
  }

  // Copy the template files to the workspace
  for (const relativeTemplatePath of template.files) {
    const relativeWorkspacePath =
      relativeTemplateToWorkspacePath(relativeTemplatePath);

    if (
      force === false &&
      matchingRelativeWorkspacePaths.includes(relativeWorkspacePath)
    ) {
      continue;
    }

    const absoluteTemplatePath = path.join(template.path, relativeTemplatePath);
    const absoluteWorkspacePath = path.join(workspace, relativeWorkspacePath);

    await ensureDir(path.dirname(absoluteWorkspacePath));
    await copy(absoluteTemplatePath, absoluteWorkspacePath);
  }

  console.log(`✨ ${chalk.cyan(`Template files copied`)} ✨`);
}

/**
 * installProjectDependencies prints the commands to install the project dependencies
 * and runs them if the install option is true or if the user opts-in to it.
 *
 * NOTE: This function is exported for testing purposes
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @param template The template to use for the project initialization.
 * @param install Whether to install the project dependencies.
 * @param update Whether to update the project dependencies.
 */
export async function installProjectDependencies(
  workspace: string,
  template: Template,
  install?: boolean,
  update?: boolean,
): Promise<void> {
  const pathToWorkspacePackageJson = path.join(workspace, "package.json");

  const workspacePkg: PackageJson = await readJsonFile(
    pathToWorkspacePackageJson,
  );

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

  // Checking both workspace dependencies and dev dependencies in case the user
  // installed a dev dependency as a dependency
  const workspaceDependencies = {
    ...(workspacePkg.dependencies ?? {}),
    ...(workspacePkg.devDependencies ?? {}),
  };

  // We need to strip the optional workspace prefix from template dependency versions
  const templateDependencyEntries = Object.entries(templateDependencies).map(
    ([name, version]) => [name, version.replace(/^workspace:/, "")],
  );

  // Finding the dependencies that are not already installed
  const dependenciesToInstall = templateDependencyEntries
    .filter(([name]) => workspaceDependencies[name] === undefined)
    .map(([name, version]) => `${name}@${version}`);

  // Try to install the missing dependencies if there are any
  if (Object.keys(dependenciesToInstall).length !== 0) {
    // Retrieve the package manager specific installation command
    const command = getDevDependenciesInstallationCommand(
      packageManager,
      dependenciesToInstall,
    );
    const commandString = command.join(" ");

    // Ask the user for permission to install the project dependencies
    if (install === undefined) {
      install = await promptForInstall(commandString);
    }

    // If the user grants permission to install the dependencies, run the installation command
    if (install) {
      console.log();
      console.log(commandString);

      await spawn(command[0], command.slice(1), {
        cwd: workspace,
        // We need to run with `shell: true` for this to work on powershell, but
        // we already enclosed every dependency identifier in quotes, so this
        // is safe.
        shell: true,
        stdio: "inherit",
      });

      console.log(`✨ ${chalk.cyan(`Dependencies installed`)} ✨`);
    }
  }

  // NOTE: Even though the dependency updates are very similar to pure
  // installations, they are kept separate to allow the user to skip one while
  // proceeding with the other, and to allow us to design handling of these
  // two processes independently.

  // Finding the installed dependencies that have an incompatible version
  const dependenciesToUpdate = templateDependencyEntries
    .filter(([dependencyName, templateVersion]) => {
      const workspaceVersion = workspaceDependencies[dependencyName];
      return shouldUpdateDependency(workspaceVersion, templateVersion);
    })
    .map(([name, version]) => `${name}@${version}`);

  // Try to update the missing dependencies if there are any.
  if (dependenciesToUpdate.length !== 0) {
    // Retrieve the package manager specific installation command
    const command = getDevDependenciesInstallationCommand(
      packageManager,
      dependenciesToUpdate,
    );
    const commandString = command.join(" ");

    // Ask the user for permission to update the project dependencies
    if (update === undefined) {
      update = await promptForUpdate(commandString);
    }

    if (update) {
      console.log();
      console.log(commandString);

      await spawn(command[0], command.slice(1), {
        cwd: workspace,
        // We need to run with `shell: true` for this to work on powershell, but
        // we already enclosed every dependency identifier in quotes, so this
        // is safe.
        shell: true,
        stdio: "inherit",
      });

      console.log(`✨ ${chalk.cyan(`Dependencies updated`)} ✨`);
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

// NOTE: This function is exported for testing purposes only.
export function shouldUpdateDependency(
  workspaceVersion: string | undefined,
  templateVersion: string,
): boolean {
  // We should not update the dependency if it is not yet installed in the workspace.
  if (workspaceVersion === undefined) {
    return false;
  }
  // NOTE: a specific version also a valid range that includes itself only
  const workspaceRange = semver.validRange(workspaceVersion, {
    includePrerelease: true,
  });
  const templateRange = semver.validRange(templateVersion, {
    includePrerelease: true,
  });
  assertHardhatInvariant(
    templateRange !== null,
    "All dependencies of the template should have valid versions",
  );
  // We should update the dependency if the workspace version could not be parsed.
  if (workspaceRange === null) {
    return true;
  }
  // We should update the dependency if the workspace range (or, in particular, a specific version) is not
  // a strict subset of the template range/does not equal the template version.
  return !semver.subset(workspaceRange, templateRange, {
    includePrerelease: true,
  });
}
