// @ts-check

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { styleText } from "node:util";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * @typedef {object} PeerBump
 * @property {string} package
 * @property {string} peer
 * @property {string} reason
 * @property {string} [version]
 */

/**
 * @typedef {object} PeerBumpsConfig
 * @property {string[]} excludedFolders
 * @property {PeerBump[]} bumps
 */

/**
 * @typedef {object} PnpmPackage
 * @property {string} name
 * @property {string} version
 * @property {string} path
 */

/**
 * @typedef {object} PackageJson
 * @property {string} [name]
 * @property {string} [version]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [peerDependencies]
 */

/**
 * @typedef {object} PackageModification
 * @property {string} packagePath
 * @property {PackageJson} packageJson
 * @property {Map<string, string>} peerChanges - peer name -> new version
 */

// =============================================================================
// Constants
// =============================================================================

const ROOT_DIR = resolve(import.meta.dirname, "..");
const CONFIG_FILE = ".peer-bumps.json";
const CONFIG_PATH = resolve(ROOT_DIR, CONFIG_FILE);
const PREFIX = "[bump-peers]";

// =============================================================================
// Logging Helpers
// =============================================================================

/**
 * @param {string} msg
 * @returns {void}
 */
function log(msg) {
  console.log(`${styleText("cyan", PREFIX)} ${msg}`);
}

/**
 * @param {string} step
 * @returns {void}
 */
function logStep(step) {
  console.log(styleText(["bold", "yellow"], `${PREFIX} === ${step} ===`));
}

/**
 * @param {string} msg
 * @returns {void}
 */
function logError(msg) {
  console.error(styleText("red", `${PREFIX} Error: ${msg}`));
}

// Styling helpers for consistent formatting
const fmt = {
  /** @param {string} name */
  pkg: (name) => styleText("bold", name),
  /** @param {string} v */
  version: (v) => styleText("green", v),
  /** @param {string} text */
  deemphasize: (text) => styleText("dim", text),
  /** @param {string} text */
  success: (text) => styleText("green", text),
};

// =============================================================================
// Shell Helpers
// =============================================================================

/**
 * @param {string} command
 * @returns {string}
 */
function which(command) {
  return execSync(`which ${command}`, { encoding: "utf-8" }).trim();
}

/** @type {string | undefined} */
let gitPath;

/**
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  if (gitPath === undefined) {
    gitPath = which("git");
  }
  return execFileSync(gitPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
  }).trim();
}

/** @type {string | undefined} */
let pnpmPath;

/**
 * @param {string[]} args
 * @returns {string}
 */
function pnpm(args) {
  if (pnpmPath === undefined) {
    pnpmPath = which("pnpm");
  }
  return execFileSync(pnpmPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
  }).trim();
}

// =============================================================================
// Config Helpers
// =============================================================================

/**
 * @returns {PeerBumpsConfig}
 */
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found: ${CONFIG_FILE}\nCreate it with: { "excludedFolders": [], "bumps": [] }`,
    );
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");
  /** @type {unknown} */
  let config;

  try {
    config = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}`);
  }

  validateConfigSchema(config);
  return /** @type {PeerBumpsConfig} */ (config);
}

/**
 * @param {unknown} config
 * @returns {void}
 */
function validateConfigSchema(config) {
  if (typeof config !== "object" || config === null) {
    throw new Error(`${CONFIG_FILE} must be an object`);
  }

  const obj = /** @type {Record<string, unknown>} */ (config);

  if (!Array.isArray(obj.excludedFolders)) {
    throw new Error(`${CONFIG_FILE} must have an "excludedFolders" array`);
  }

  for (const folder of obj.excludedFolders) {
    if (typeof folder !== "string") {
      throw new Error(`${CONFIG_FILE} excludedFolders must contain strings`);
    }
  }

  if (!Array.isArray(obj.bumps)) {
    throw new Error(`${CONFIG_FILE} must have a "bumps" array`);
  }

  for (const bump of obj.bumps) {
    if (typeof bump !== "object" || bump === null) {
      throw new Error(`${CONFIG_FILE} bumps must be objects`);
    }

    const bumpObj = /** @type {Record<string, unknown>} */ (bump);

    if (typeof bumpObj.package !== "string") {
      throw new Error(
        `${CONFIG_FILE} bump entries must have a "package" string`,
      );
    }

    if (typeof bumpObj.peer !== "string") {
      throw new Error(`${CONFIG_FILE} bump entries must have a "peer" string`);
    }

    if (typeof bumpObj.reason !== "string") {
      throw new Error(
        `${CONFIG_FILE} bump entries must have a "reason" string`,
      );
    }

    if (bumpObj.version !== undefined && typeof bumpObj.version !== "string") {
      throw new Error(
        `${CONFIG_FILE} bump entry "version" must be a string if present`,
      );
    }
  }
}

// =============================================================================
// Git Helpers
// =============================================================================

/**
 * @returns {void}
 */
function validateNoChangesets() {
  const changesetDir = resolve(ROOT_DIR, ".changeset");

  if (!existsSync(changesetDir)) {
    throw new Error(`Changeset directory not found: ${changesetDir}`);
  }

  const files = readdirSync(changesetDir);
  const changesetFiles = files.filter(
    (file) => file.endsWith(".md") && file !== "README.md",
  );

  if (changesetFiles.length > 0) {
    throw new Error(
      `Pending changesets found: ${changesetFiles.join(", ")}\n` +
        `Run \`pnpm changeset version --no-commit\` first to consume them.`,
    );
  }
}

/**
 * @param {string} ref
 * @param {string} filePath
 * @returns {string | null}
 */
function getFileFromCommit(ref, filePath) {
  try {
    return git(["show", `${ref}:${filePath}`]);
  } catch {
    return null;
  }
}

// =============================================================================
// Package Helpers
// =============================================================================

/**
 * @returns {PnpmPackage[]}
 */
function getWorkspacePackages() {
  const output = pnpm(["ls", "-r", "--depth", "-1", "--json"]);
  return /** @type {PnpmPackage[]} */ (JSON.parse(output));
}

/**
 * @param {PnpmPackage[]} packages
 * @param {string[]} excludedFolders
 * @returns {PnpmPackage[]}
 */
function filterPackages(packages, excludedFolders) {
  /** @type {PnpmPackage[]} */
  const result = [];

  for (const pkg of packages) {
    const relativePath = relative(ROOT_DIR, pkg.path);
    let excluded = false;

    for (const excludedFolder of excludedFolders) {
      if (relativePath.startsWith(excludedFolder)) {
        log(
          `  Excluding ${fmt.pkg(pkg.name)} ${fmt.deemphasize(`(in ${excludedFolder})`)}`,
        );

        excluded = true;
        break;
      }
    }

    if (!excluded) {
      result.push(pkg);
    }
  }

  return result;
}

/**
 * @param {PnpmPackage[]} packages
 * @returns {Map<string, PnpmPackage>}
 */
function buildPackageMap(packages) {
  /** @type {Map<string, PnpmPackage>} */
  const map = new Map();

  for (const pkg of packages) {
    map.set(pkg.name, pkg);
  }

  return map;
}

/**
 * @param {string} packagePath
 * @returns {PackageJson}
 */
function readPackageJson(packagePath) {
  const filePath = resolve(packagePath, "package.json");
  const content = readFileSync(filePath, "utf-8");
  return /** @type {PackageJson} */ (JSON.parse(content));
}

/**
 * @param {string} packagePath
 * @param {PackageJson} json
 * @returns {void}
 */
function writePackageJson(packagePath, json) {
  const filePath = resolve(packagePath, "package.json");
  const content = JSON.stringify(json, null, 2) + "\n";
  writeFileSync(filePath, content);
}

/**
 * @param {string} version
 * @returns {boolean}
 */
function isWorkspaceDependency(version) {
  return version.startsWith("workspace:");
}

/**
 * @param {string} version
 * @returns {string}
 */
function buildWorkspaceVersion(version) {
  return `workspace:^${version}`;
}

// =============================================================================
// Core Workflow Functions
// =============================================================================

/**
 * @param {PnpmPackage[]} packages
 * @returns {Map<string, PackageModification>}
 */
function revertPeerDependencies(packages) {
  logStep("Reverting peer dependency changes");

  /** @type {Map<string, PackageModification>} */
  const modifications = new Map();

  for (const pkg of packages) {
    const packageJson = readPackageJson(pkg.path);
    const peerDeps = packageJson.peerDependencies;

    if (peerDeps === undefined || Object.keys(peerDeps).length === 0) {
      continue;
    }

    const relativePath = relative(ROOT_DIR, pkg.path);
    const previousContent = getFileFromCommit(
      "HEAD",
      `${relativePath}/package.json`,
    );

    if (previousContent === null) {
      // New package with peer dependencies - this is a change from HEAD
      throw new Error(
        `Package ${pkg.name} is new (not in last commit) and has peer dependencies. ` +
          `This tool cannot process new packages.`,
      );
    }

    const previousPackageJson = /** @type {PackageJson} */ (
      JSON.parse(previousContent)
    );

    const previousPeerDeps = previousPackageJson.peerDependencies ?? {};
    let hasChanges = false;

    for (const [peerName, currentVersion] of Object.entries(peerDeps)) {
      if (!isWorkspaceDependency(currentVersion)) {
        // External dependency, not managed by this tool
        log(
          `  ${fmt.pkg(pkg.name)}: ${fmt.deemphasize(`${peerName} is external, skipping`)}`,
        );
        continue;
      }

      const previousVersion = previousPeerDeps[peerName];

      if (previousVersion === undefined) {
        // New peer dependency - this is a change from HEAD
        throw new Error(
          `Package ${pkg.name} has new peer dependency ${peerName} (not in last commit). ` +
            `This tool cannot process new peer dependencies.`,
        );
      }

      if (!isWorkspaceDependency(previousVersion)) {
        // Was converted from external to workspace dependency, keep current
        log(
          `  ${fmt.pkg(pkg.name)}: ${peerName} was converted to workspace, keeping ${fmt.version(currentVersion)}`,
        );
        continue;
      }

      if (currentVersion !== previousVersion) {
        // Revert to previous version
        peerDeps[peerName] = previousVersion;
        hasChanges = true;

        log(
          `  ${fmt.pkg(pkg.name)}: reverted ${peerName} to ${fmt.version(previousVersion)}`,
        );

        // Track the change
        let modification = modifications.get(pkg.name);

        if (modification === undefined) {
          modification = {
            packagePath: pkg.path,
            packageJson,
            peerChanges: new Map(),
          };
          modifications.set(pkg.name, modification);
        }

        modification.peerChanges.set(peerName, previousVersion);
      }
    }

    if (hasChanges && !modifications.has(pkg.name)) {
      modifications.set(pkg.name, {
        packagePath: pkg.path,
        packageJson,
        peerChanges: new Map(),
      });
    }
  }

  if (modifications.size === 0) {
    log(fmt.deemphasize("  No peer dependency changes to revert"));
  }

  return modifications;
}

/**
 * @param {PeerBump[]} bumps
 * @param {Map<string, PnpmPackage>} packageMap
 * @param {string[]} excludedFolders
 * @param {Map<string, PackageModification>} modifications
 * @returns {void}
 */
function applyIntentionalBumps(
  bumps,
  packageMap,
  excludedFolders,
  modifications,
) {
  if (bumps.length === 0) {
    logStep("No intentional bumps to apply");
    return;
  }

  logStep("Applying intentional bumps");

  for (const bump of bumps) {
    const pkg = packageMap.get(bump.package);

    if (pkg === undefined) {
      throw new Error(`Bump references unknown package: ${bump.package}`);
    }

    // Check if package is in an excluded folder
    const relativePath = relative(ROOT_DIR, pkg.path);

    for (const excluded of excludedFolders) {
      if (relativePath.startsWith(excluded)) {
        throw new Error(
          `Bump targets package in excluded folder: ${bump.package} (in ${excluded})`,
        );
      }
    }

    // Get or create modification entry
    let modification = modifications.get(bump.package);

    if (modification === undefined) {
      const packageJson = readPackageJson(pkg.path);
      modification = {
        packagePath: pkg.path,
        packageJson,
        peerChanges: new Map(),
      };
      modifications.set(bump.package, modification);
    }

    const peerDeps = modification.packageJson.peerDependencies;

    if (peerDeps === undefined || peerDeps[bump.peer] === undefined) {
      throw new Error(
        `Package ${bump.package} does not have peer dependency: ${bump.peer}`,
      );
    }

    // Determine the version to use
    /** @type {string} */
    let targetVersion;

    if (bump.version !== undefined) {
      targetVersion = bump.version;
    } else {
      const peerPackage = packageMap.get(bump.peer);

      if (peerPackage === undefined) {
        throw new Error(`Bump references unknown peer package: ${bump.peer}`);
      }

      targetVersion = peerPackage.version;
    }

    const newVersion = buildWorkspaceVersion(targetVersion);
    peerDeps[bump.peer] = newVersion;
    modification.peerChanges.set(bump.peer, newVersion);

    log(
      `  ${fmt.pkg(bump.package)}: bumped ${bump.peer} to ${fmt.version(newVersion)}`,
    );
    log(`    ${fmt.deemphasize(`Reason: ${bump.reason}`)}`);
  }
}

/**
 * @param {Map<string, PackageModification>} modifications
 * @returns {void}
 */
function syncPeerToDevDependencies(modifications) {
  logStep("Syncing peerDependencies to devDependencies");

  let syncCount = 0;

  for (const [pkgName, modification] of modifications) {
    const { packageJson } = modification;
    const peerDeps = packageJson.peerDependencies ?? {};
    let devDeps = packageJson.devDependencies;

    // Create devDependencies if it doesn't exist and there are peers to sync
    if (devDeps === undefined && Object.keys(peerDeps).length > 0) {
      devDeps = {};
      packageJson.devDependencies = devDeps;
    }

    if (devDeps === undefined) {
      continue;
    }

    for (const [peerName, peerVersion] of Object.entries(peerDeps)) {
      const devVersion = devDeps[peerName];

      if (devVersion === undefined) {
        // Missing from devDependencies, add it
        devDeps[peerName] = peerVersion;
        syncCount++;
        log(
          `  ${fmt.pkg(pkgName)}: added ${peerName} to devDependencies as ${fmt.version(peerVersion)}`,
        );
      } else if (devVersion !== peerVersion) {
        // Different version, update it
        devDeps[peerName] = peerVersion;
        syncCount++;
        log(
          `  ${fmt.pkg(pkgName)}: updated ${peerName} in devDependencies to ${fmt.version(peerVersion)}`,
        );
      }
    }
  }

  if (syncCount === 0) {
    log(fmt.deemphasize("  No devDependencies needed syncing"));
  }
}

/**
 * @param {Map<string, PackageModification>} modifications
 * @returns {void}
 */
function writeModifications(modifications) {
  logStep("Writing package.json files");

  for (const [pkgName, modification] of modifications) {
    writePackageJson(modification.packagePath, modification.packageJson);
    log(`  Updated ${fmt.pkg(pkgName)}`);
  }

  if (modifications.size === 0) {
    log(fmt.deemphasize("  No files to write"));
  }
}

/**
 * @returns {void}
 */
function clearBumpsInConfig() {
  logStep("Clearing bumps in config");

  const config = loadConfig();
  config.bumps = [];

  const content = JSON.stringify(config, null, 2) + "\n";
  writeFileSync(CONFIG_PATH, content);

  log(`  Cleared bumps array in ${CONFIG_FILE}`);
}

// =============================================================================
// Commands
// =============================================================================

/**
 * @returns {void}
 */
function printUsage() {
  console.log(`
bump-peers - Manage peer dependency bumps in this pnpm monorepo

DESCRIPTION
  This tool addresses the problem where changesets automatically bumps internal
  peer dependencies too aggressively. It works by:

  1. Reverting all workspace peer dependency changes made by changesets
  2. Applying only intentional bumps declared in ${CONFIG_FILE}

WORKFLOW
  1. Run \`pnpm changeset version --no-commit\`
  2. Run \`node scripts/bump-peers.mjs apply\`
  3. Review changes and commit manually

EDGE CASES
  The tool validates that no pending changeset files exist (i.e., changesets
  have been consumed by \`pnpm changeset version --no-commit\`). If .md files
  other than README.md exist in .changeset/, the tool will fail with an error.

  The tool handles several edge cases when reverting peer dependencies:

  - Excluded packages: Packages in excludedFolders are skipped entirely and
    logged. This is useful for example projects, templates, or archived code.

  - New packages: If a package didn't exist in the last commit and has peer
    dependencies, the tool will fail. New packages are not supported.

  - External peer dependencies: Peer dependencies that don't use the
    "workspace:" protocol are skipped, as they're not managed by this tool.

  - New peer dependencies: If a peer dependency was added in the working
    directory (didn't exist before), the tool will fail. New peer dependencies
    are not supported.

  - Converted dependencies: If a peer dependency was changed from an external
    version to a workspace dependency, it's kept as-is since that conversion
    is intentional.

  - Changed workspace versions: Only workspace peer dependencies that existed
    before AND changed version are reverted to their previous values.

  After reverting and applying bumps, the tool syncs peerDependencies to
  devDependencies for all modified packages:

  - Missing devDependencies: If a peer dependency is not in devDependencies,
    it will be added with the same version range.

  - Mismatched versions: If a peer dependency exists in devDependencies but
    has a different version range, it will be updated to match.

  This applies to both workspace and external peer dependencies.

CONFIGURATION
  Create ${CONFIG_FILE} in the repository root:

  {
    "excludedFolders": ["archive", "v-next/example-project"],
    "bumps": [
      {
        "package": "@nomicfoundation/hardhat-ignition-ethers",
        "peer": "hardhat",
        "reason": "Requires new task API from hardhat 3.1.0",
        "version": "3.1.0"
      },
      {
        "package": "@nomicfoundation/hardhat-ethers",
        "peer": "hardhat",
        "reason": "Requires new network helpers"
      }
    ]
  }

  Fields:
    excludedFolders - Package folders to skip (relative to repo root)
    bumps           - Intentional peer dependency bumps to apply
      package       - The package that has the peer dependency
      peer          - The peer dependency to bump
      reason        - Why this bump is intentional (for documentation)
      version       - (Optional) Specific version; defaults to peer's current version (the one being released)

COMMANDS
  apply     Run the peer dependency management workflow
  (none)    Print this usage information

EXAMPLES
  node scripts/bump-peers.mjs          # Print usage
  node scripts/bump-peers.mjs apply    # Apply peer dependency fixes
`);
}

/**
 * @returns {void}
 */
function apply() {
  log("Starting peer dependency management");

  // Load and validate config
  const config = loadConfig();
  log(`Loaded config with ${config.bumps.length} intentional bump(s)`);

  // Validate we're in the right state
  validateNoChangesets();
  log("Verified no pending changesets");

  // Get workspace packages
  logStep("Filtering workspace packages");
  const allPackages = getWorkspacePackages();
  const packages = filterPackages(allPackages, config.excludedFolders);
  const packageMap = buildPackageMap(packages);

  log(
    `Found ${packages.length} packages (excluded ${allPackages.length - packages.length})`,
  );

  // Revert automatic peer dependency bumps
  const modifications = revertPeerDependencies(packages);

  // Apply intentional bumps
  applyIntentionalBumps(
    config.bumps,
    packageMap,
    config.excludedFolders,
    modifications,
  );

  // Sync peer deps to dev deps
  syncPeerToDevDependencies(modifications);

  // Write all changes
  writeModifications(modifications);

  // Clear the bumps array in config
  clearBumpsInConfig();

  log(fmt.success("Done! Review the changes and commit manually."));
}

// =============================================================================
// Entry Point
// =============================================================================

/**
 * @returns {void}
 */
function main() {
  const command = process.argv[2];

  try {
    if (command === "apply") {
      apply();
    } else {
      printUsage();
    }
  } catch (error) {
    logError(/** @type {Error} */ (error).message);
    process.exit(1);
  }
}

main();
