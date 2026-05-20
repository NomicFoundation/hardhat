import type { Template } from "./template.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import path from "node:path";
import { styleText } from "node:util";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  copy,
  ensureDir,
  exists,
  getAllFilesMatching,
  isDirectory,
  mkdir,
  readJsonFile,
  remove,
  symlink,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { findClosestPackageRoot } from "@nomicfoundation/hardhat-utils/package";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import * as semver from "semver";

import { findClosestHardhatConfig } from "../../config-loading.js";
import { HARDHAT_NAME } from "../../constants.js";
import {
  getHardhatVersion,
  getLatestHardhatVersion,
} from "../../utils/package.js";
import { BannerManager } from "../banner-manager.js";
import { sendProjectTypeAnalytics } from "../telemetry/analytics/analytics.js";
import { sendErrorTelemetry } from "../telemetry/error-reporter/reporter.js";

import {
  getDevDependenciesInstallationCommand,
  getPackageManager,
  getVersion,
  installsPeerDependenciesByDefault,
} from "./package-manager.js";
import {
  promptForMigrateToEsm,
  promptForForce,
  promptForInstall,
  promptForTemplate,
  promptForUpdate,
  promptForWorkspace,
  promptForHardhatVersion,
} from "./prompt.js";
import { spawn } from "./subprocess.js";
import { getTemplates } from "./template.js";

export interface NonInteractiveInitHardhat3Options {
  template: string;
}

export interface InitHardhatOptions {
  hardhatVersion?: "hardhat-2" | "hardhat-3";
  workspace?: string;
  migrateToEsm?: boolean;
  template?: string;
  force?: boolean;
  install?: boolean;
}

const log = createDebug("hardhat:core:cli:init");

export async function initHardhat3NonInteractive(
  options: NonInteractiveInitHardhat3Options,
): Promise<void> {
  const [template, projectTypeAnalyticsPromise] = await getTemplate(
    "hardhat-3",
    options.template,
    true,
  );

  const workspace = process.cwd();

  try {
    const configFilePath = await findClosestHardhatConfig(workspace);

    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: configFilePath,
      },
    );
  } catch (err) {
    if (
      !HardhatError.isHardhatError(
        err,
        HardhatError.ERRORS.CORE.GENERAL.NO_CONFIG_FILE_FOUND,
      )
    ) {
      throw err;
    }
  }

  await assertNoNonInteractiveClashes(workspace, template);

  console.log("Initializing project...");

  await validatePackageJson(workspace, template.packageJson, true);

  await copyProjectFilesNonInteractive(workspace, template);

  console.log("Installing dependencies...");

  await Promise.all([
    installProjectDependencies({
      workspace,
      template,
      install: true,
      update: true,
      formatSuccessMessage: false,
    }),
    projectTypeAnalyticsPromise,
  ]);

  console.log("Project initialized");
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

    const hardhatVersion =
      options?.hardhatVersion ?? (await promptForHardhatVersion());

    // Ask the user for the workspace to initialize the project in
    // if it was not provided, and validate that it is not already initialized
    const workspace = await getWorkspace(options?.workspace);

    // Ask the user for the template to use for the project initialization
    // if it was not provided, and validate that it exists
    const [template, projectTypeAnalyticsPromise] = await getTemplate(
      hardhatVersion,
      options?.template,
    );

    // Create the package.json file if it does not exist
    // and validate that it is an esm package
    await validatePackageJson(
      workspace,
      template.packageJson,
      options?.migrateToEsm,
    );

    // Copy the template files to the workspace
    // Overwrite existing files only if the user opts-in to it
    await copyProjectFiles(workspace, template, options?.force);

    // Print the commands to install the project dependencies
    // Run them only if the user opts-in to it
    // Concurrently, await the analytics hit
    await Promise.all([
      installProjectDependencies({
        workspace,
        template,
        install: options?.install,
      }),
      projectTypeAnalyticsPromise,
    ]);

    showStarOnGitHubMessage();

    try {
      const bannerManager = await BannerManager.getInstance();
      await bannerManager.showBanner();
    } catch (bannerError) {
      log("Error showing banner", bannerError);
    }
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

  console.log(styleText("blue", logoLines));

  // Re-enable auto-wapping
  process.stdout.write("\x1b[?7h");
}

// NOTE: This function is exported for testing purposes
export async function printWelcomeMessage(): Promise<void> {
  const hardhatVersion = await getHardhatVersion();

  console.log(
    styleText("cyan", `👷 Welcome to ${HARDHAT_NAME} v${hardhatVersion} 👷\n`),
  );

  // Warn the user if they are using an outdated version of Hardhat
  try {
    const latestHardhatVersion = await getLatestHardhatVersion();
    if (hardhatVersion !== latestHardhatVersion) {
      console.warn(
        styleText(
          ["yellow", "bold"],
          `⚠️ You are using an outdated version of Hardhat. The latest version is v${latestHardhatVersion}. Please consider upgrading to the latest version before continuing with the project initialization. ⚠️\n`,
        ),
      );
    }
  } catch (error) {
    ensureError(error);
    try {
      await sendErrorTelemetry(error);
    } catch (e) {
      log("Couldn't report error to sentry: %O", e);
    }
    console.warn(
      styleText(
        ["yellow", "bold"],
        `⚠️ We couldn't check if you are using the latest version of Hardhat. Please consider upgrading to the latest version if you are not using it yet. ⚠️\n`,
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

  if ((await exists(workspace)) && !(await isDirectory(workspace))) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.WORKSPACE_MUST_BE_A_DIRECTORY,
      {
        workspace,
      },
    );
  }

  // If the path points to a non-existent folder, create it; otherwise, do nothing
  await mkdir(workspace);

  // Validate that the workspace is not already initialized
  try {
    const configFilePath = await findClosestHardhatConfig(workspace);

    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: configFilePath,
      },
    );
  } catch (err) {
    if (
      HardhatError.isHardhatError(err) &&
      err.number ===
        HardhatError.ERRORS.CORE.GENERAL.NO_CONFIG_FILE_FOUND.number
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
 * @param hardhatVersion The version of Hardhat whose templates should be considered.
 * @param template The name of the template to use for the project initialization.
 * @param includeAvailableTemplatesInErrors When true, a missing template throws
 *   `TEMPLATE_NOT_FOUND_WITH_LIST_OF_OPTIONS` (which lists the available
 *   templates) instead of the bare `TEMPLATE_NOT_FOUND`.
 * @returns A tuple with two elements: the template and a promise with the analytics hit.
 */
export async function getTemplate(
  hardhatVersion: "hardhat-2" | "hardhat-3",
  template?: string,
  includeAvailableTemplatesInErrors = false,
): Promise<[Template, Promise<boolean>]> {
  const templates = await getTemplates(hardhatVersion);

  // Ask the user for the template to use for the project initialization if it was not provided
  if (template === undefined) {
    template = await promptForTemplate(templates);
  }

  const projectTypeAnalyticsPromise = sendProjectTypeAnalytics(
    hardhatVersion,
    template,
  );

  // Validate that the template exists
  for (const t of templates) {
    if (t.name === template) {
      return [t, projectTypeAnalyticsPromise];
    }
  }

  // we wait for the GA hit before throwing
  await projectTypeAnalyticsPromise;

  if (!includeAvailableTemplatesInErrors) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.TEMPLATE_NOT_FOUND,
      {
        template,
      },
    );
  }

  const availableTemplates = templates.map((t) => `  - ${t.name}`).join("\n");
  throw new HardhatError(
    HardhatError.ERRORS.CORE.GENERAL.TEMPLATE_NOT_FOUND_WITH_LIST_OF_OPTIONS,
    {
      template,
      availableTemplates,
    },
  );
}

/**
 * Prints the list of available templates for the specified Hardhat version.
 *
 * @param hardhatVersion The version of Hardhat whose templates should be
 *  printed.
 */
export async function printTemplatesList(
  hardhatVersion: "hardhat-2" | "hardhat-3",
  print: (message: string) => void = console.log,
): Promise<void> {
  const templates = await getTemplates(hardhatVersion);
  const lines = templates.map((t) => `  - ${t.name}`).join("\n");
  print(`Available templates:\n${lines}`);
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
  templatePkg: PackageJson,
  migrateToEsm?: boolean,
): Promise<void> {
  const absolutePathToPackageJson = path.join(workspace, "package.json");
  const shouldUseEsm = templatePkg.type === "module";

  // Create the package.json file if it does not exist
  if (!(await exists(absolutePathToPackageJson))) {
    const packageJson: PackageJson = {
      name: path.basename(workspace),
      version: "1.0.0",
    };

    if (shouldUseEsm) {
      packageJson.type = "module";
    }

    await writeJsonFile(absolutePathToPackageJson, packageJson);
  }

  const packageManager = getPackageManager();

  // We know this works with npm, pnpm, but not with yarn. If, so we use
  // pnpm or npm exclusively.
  // If you read this comment and wonder if this is outdated, you can
  // answer it by checking if the most popular versions of yarn and other
  // package managers support `<package manager> pkg set type=module`.
  const packageManagerToUse = packageManager === "pnpm" ? "pnpm" : "npm";

  // We need to set the hardhat version in the package.json file
  // to ensure that the template is compatible with the current Hardhat version.
  // This is needed because we have hardhat-2 and hardhat-3 templates,
  // and the user may install hardhat 3 first and then initialize a project
  // with a hardhat-2 template.
  const templateHardhatVersion = templatePkg.devDependencies?.hardhat ?? "";
  if (templateHardhatVersion.startsWith("^2")) {
    await spawn(
      [packageManagerToUse, "pkg", "delete", "dependencies.hardhat"].join(" "),
      [],
      {
        cwd: workspace,
        shell: true,
        stdio: "inherit",
      },
    );
  }

  if (!shouldUseEsm) {
    return;
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
    throw new HardhatError(HardhatError.ERRORS.CORE.GENERAL.ONLY_ESM_SUPPORTED);
  }

  await spawn(
    [packageManagerToUse, "pkg", "set", "type=module"].join(" "),
    [],
    {
      cwd: workspace,
      shell: true,
      stdio: "inherit",
    },
  );
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
  // Find all the paths in the template that clash with an existing one in the
  // workspace
  const matchingRelativeWorkspacePaths = (
    await Promise.all(
      template.files.map(async (relativeTemplatePath) => {
        const relativeWorkspacePath =
          relativeTemplateToWorkspacePath(relativeTemplatePath);

        const absoluteWorkspacePath = path.join(
          workspace,
          relativeWorkspacePath,
        );

        if (!(await exists(absoluteWorkspacePath))) {
          return undefined;
        }

        // We ignore directories in this clash detection
        if (await isDirectory(absoluteWorkspacePath)) {
          return undefined;
        }

        return relativeWorkspacePath;
      }),
    )
  ).filter((relativeWorkspacePath) => relativeWorkspacePath !== undefined);

  const matchingRelativeWorkspacePathsSet = new Set(
    matchingRelativeWorkspacePaths,
  );

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
      matchingRelativeWorkspacePathsSet.has(relativeWorkspacePath)
    ) {
      continue;
    }

    const absoluteTemplatePath = path.join(template.path, relativeTemplatePath);
    const absoluteWorkspacePath = path.join(workspace, relativeWorkspacePath);

    await ensureDir(path.dirname(absoluteWorkspacePath));
    await copy(absoluteTemplatePath, absoluteWorkspacePath);
  }

  await installSkills(workspace, template, force);
  await createClaudeMd(workspace, force);
  await createDotClaude(workspace);

  console.log(`✨ ${styleText("cyan", `Template files copied`)} ✨`);
}

// NOTE: This function is exported for testing purposes
export async function assertNoNonInteractiveClashes(
  workspace: string,
  template: Template,
): Promise<void> {
  const clashes: string[] = [];

  for (const relativeTemplatePath of template.files) {
    const relativeWorkspacePath =
      relativeTemplateToWorkspacePath(relativeTemplatePath);

    if (
      relativeWorkspacePath === "package.json" ||
      relativeWorkspacePath === "README.md" ||
      path.basename(relativeWorkspacePath) === ".gitignore"
    ) {
      continue;
    }

    if (await exists(path.join(workspace, relativeWorkspacePath))) {
      clashes.push(relativeWorkspacePath);
    }
  }

  if (clashes.length === 0) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CORE.GENERAL.NON_INTERACTIVE_INIT_WOULD_OVERWRITE_FILES,
    {
      files: clashes.map((f) => `  - ${f}`).join("\n"),
    },
  );
}

// NOTE: This function is exported for testing purposes
export async function copyProjectFilesNonInteractive(
  workspace: string,
  template: Template,
): Promise<void> {
  for (const relativeTemplatePath of template.files) {
    const relativeWorkspacePath =
      relativeTemplateToWorkspacePath(relativeTemplatePath);
    let absoluteWorkspacePath = path.join(workspace, relativeWorkspacePath);

    if (path.basename(relativeWorkspacePath) === ".gitignore") {
      if (await exists(absoluteWorkspacePath)) {
        continue;
      }
    } else if (
      relativeWorkspacePath === "README.md" &&
      (await exists(absoluteWorkspacePath))
    ) {
      absoluteWorkspacePath = path.join(workspace, "HARDHAT.md");
      if (await exists(absoluteWorkspacePath)) {
        continue;
      }
    }

    await ensureDir(path.dirname(absoluteWorkspacePath));
    await copy(
      path.join(template.path, relativeTemplatePath),
      absoluteWorkspacePath,
    );
  }

  await installSkills(workspace, template);
  await createClaudeMd(workspace);
  await createDotClaude(workspace);
}

/**
 * Skills published from `packages/hardhat/skills/` and the npm package whose presence
 * in a template's dependencies opts that template into installing the skill.
 * Each skill is tied to exactly one package so they can be versioned and
 * upgraded independently.
 */
const SKILL_PACKAGES: ReadonlyArray<{
  packageName: string;
  skillName: string;
}> = [
  { packageName: "hardhat", skillName: "hardhat" },
  {
    packageName: "@nomicfoundation/hardhat-toolbox-viem",
    skillName: "hardhat-toolbox-viem",
  },
  {
    packageName: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
    skillName: "hardhat-toolbox-mocha-ethers",
  },
];

/**
 * For agent-aware templates (those that ship an `AGENTS.md`), copies any
 * skills from `packages/hardhat/skills/` whose corresponding package is a template
 * dependency into `<workspace>/.agents/skills/<skill-name>/`.
 */
async function installSkills(
  workspace: string,
  template: Template,
  force?: boolean,
): Promise<void> {
  if (!template.files.includes("AGENTS.md")) {
    return;
  }

  const deps = {
    ...template.packageJson.dependencies,
    ...template.packageJson.devDependencies,
  };
  const relevantSkills = SKILL_PACKAGES.filter(
    ({ packageName }) => deps[packageName] !== undefined,
  );
  if (relevantSkills.length === 0) {
    return;
  }

  const hardhatPackageRoot = await findClosestPackageRoot(import.meta.url);
  const skillsRoot = path.join(hardhatPackageRoot, "skills");

  for (const { skillName } of relevantSkills) {
    const skillSrcDir = path.join(skillsRoot, skillName);
    const skillDestDir = path.join(workspace, ".agents", "skills", skillName);
    const skillFiles = await getAllFilesMatching(skillSrcDir);
    for (const file of skillFiles) {
      const dest = path.join(skillDestDir, path.relative(skillSrcDir, file));
      if (force !== true && (await exists(dest))) {
        continue;
      }
      await ensureDir(path.dirname(dest));
      await copy(file, dest);
    }
  }
}

/**
 * Creates a `CLAUDE.md` file if an `AGENTS.md` file exists. Uses a symlink
 * except on Windows, where a file is created that references `AGENTS.md`.
 * Overwrites an existing `CLAUDE.md` only if `force` is true.
 */
async function createClaudeMd(
  workspace: string,
  force?: boolean,
): Promise<void> {
  const agentsMdPath = path.join(workspace, "AGENTS.md");
  if (!(await exists(agentsMdPath))) {
    return;
  }

  const claudeMdPath = path.join(workspace, "CLAUDE.md");
  if (await exists(claudeMdPath, { followSymlinks: false })) {
    if (force !== true) {
      return;
    }
    await remove(claudeMdPath);
  }

  if (process.platform === "win32") {
    await writeUtf8File(claudeMdPath, "@AGENTS.md\n");
  } else {
    await symlink("AGENTS.md", claudeMdPath);
  }
}

/**
 * Creates `.claude` if `.agents` exists. Uses a symlink except on Windows,
 * where the whole directory is copied. Does nothing if `.claude` already
 * exists; the `force` flag is intentionally not used here because
 * overwriting depends on whether the existing `.claude` is a file, directory,
 * or symlink, and on the OS, which is more complexity than is worthwhile.
 */
async function createDotClaude(workspace: string): Promise<void> {
  const agentsDirPath = path.join(workspace, ".agents");
  if (!(await exists(agentsDirPath))) {
    return;
  }

  const claudeDirPath = path.join(workspace, ".claude");
  if (await exists(claudeDirPath, { followSymlinks: false })) {
    return;
  }

  if (process.platform === "win32") {
    const agentsFiles = await getAllFilesMatching(agentsDirPath);
    for (const file of agentsFiles) {
      const dest = path.join(claudeDirPath, path.relative(agentsDirPath, file));
      await ensureDir(path.dirname(dest));
      await copy(file, dest);
    }
  } else {
    await symlink(".agents", claudeDirPath);
  }
}

/**
 * installProjectDependencies prints the commands to install the project dependencies
 * and runs them if the install option is true or if the user opts-in to it.
 *
 * NOTE: This function is exported for testing purposes
 *
 * @param options The installation options.
 * @param options.workspace The path to the workspace to initialize the project in.
 * @param options.template The template to use for the project initialization.
 * @param options.install Whether to install the project dependencies.
 * @param options.update Whether to update the project dependencies.
 * @param options.formatSuccessMessage Whether to format the success message or not.
 */
export async function installProjectDependencies({
  workspace,
  template,
  install,
  update,
  formatSuccessMessage = true,
}: {
  workspace: string;
  template: Template;
  install?: boolean;
  update?: boolean;
  formatSuccessMessage?: boolean;
}): Promise<void> {
  const pathToWorkspacePackageJson = path.join(workspace, "package.json");

  const workspacePkg: PackageJson = await readJsonFile(
    pathToWorkspacePackageJson,
  );

  const packageManager = getPackageManager();
  const packageManagerVersion = await getVersion(workspace, packageManager);
  const packageManagerMajorVersion = packageManagerVersion?.[0];

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
      packageManagerMajorVersion,
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

      try {
        await spawn(commandString, [], {
          cwd: workspace,
          // We need to run with `shell: true` for this to work on powershell, but
          // we already enclosed every dependency identifier in quotes, so this
          // is safe.
          shell: true,
          stdio: "inherit",
        });
      } catch (error) {
        ensureError(error);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.INIT.FAILED_TO_INSTALL_DEPENDENCIES,
          error,
        );
      }

      if (formatSuccessMessage) {
        console.log(`✨ ${styleText("cyan", `Dependencies installed`)} ✨`);
      } else {
        console.log(`Dependencies installed`);
      }
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
      packageManagerMajorVersion,
    );
    const commandString = command.join(" ");

    // Ask the user for permission to update the project dependencies
    if (update === undefined) {
      update = await promptForUpdate(commandString);
    }

    if (update) {
      console.log();
      console.log(commandString);

      try {
        await spawn(commandString, [], {
          cwd: workspace,
          // We need to run with `shell: true` for this to work on powershell, but
          // we already enclosed every dependency identifier in quotes, so this
          // is safe.
          shell: true,
          stdio: "inherit",
        });
      } catch (error) {
        ensureError(error);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.INIT.FAILED_TO_INSTALL_DEPENDENCIES,
          error,
        );
      }

      if (formatSuccessMessage) {
        console.log(`✨ ${styleText("cyan", `Dependencies updated`)} ✨`);
      } else {
        console.log("Dependencies updated");
      }
    }
  }
}

function showStarOnGitHubMessage() {
  console.log(
    styleText(
      "cyan",
      "Give Hardhat a star on GitHub if you're enjoying it! ⭐️✨",
    ),
  );
  console.log();
  console.log(
    styleText("cyan", "     https://github.com/NomicFoundation/hardhat"),
  );
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
