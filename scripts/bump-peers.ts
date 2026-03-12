import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { styleText } from "node:util";

// =============================================================================
// Type Definitions
// =============================================================================

interface PeerBump {
  package: string;
  peer: string;
  reason: string;
  version?: string;
}

interface PeerBumpsConfig {
  excludedFolders: string[];
  bumps: PeerBump[];
}

interface PnpmPackage {
  name: string;
  version: string;
  path: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface PackageModification {
  packagePath: string;
  packageJson: PackageJson;
  peerChanges: Map<string, string>;
}

// =============================================================================
// Constants (must be before functions that use them, as const is not hoisted)
// =============================================================================

const ROOT_DIR = resolve(import.meta.dirname, "..");
const CONFIG_FILE = ".peer-bumps.json";
const CONFIG_PATH = resolve(ROOT_DIR, CONFIG_FILE);
const PREFIX = "[bump-peers]";

// Styling helpers for consistent formatting
const fmt = {
  pkg: (name: string) => styleText("bold", name),
  version: (v: string) => styleText("green", v),
  deemphasize: (text: string) => styleText("dim", text),
  success: (text: string) => styleText("green", text),
};

let gitPath: string | undefined;

let pnpmPath: string | undefined;

// =============================================================================
// Entry Point
// =============================================================================

function main(): void {
  const command = process.argv[2];

  try {
    if (command === "apply") {
      apply();
    } else {
      printUsage();
    }
  } catch (error) {
    logError((error as Error).message);
    process.exit(1);
  }
}

// =============================================================================
// Commands
// =============================================================================

function apply(): void {
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

  // Snapshot reverted peers before intentional bumps are re-applied
  const revertedPeers = new Map<string, Set<string>>();
  for (const [pkgName, mod] of modifications) {
    if (mod.peerChanges.size > 0) {
      revertedPeers.set(pkgName, new Set(mod.peerChanges.keys()));
    }
  }

  // Apply intentional bumps
  applyIntentionalBumps(
    config.bumps,
    packageMap,
    config.excludedFolders,
    modifications,
  );

  // Remove re-applied bumps from reverted set
  for (const bump of config.bumps) {
    const peers = revertedPeers.get(bump.package);
    if (peers !== undefined) {
      peers.delete(bump.peer);
      if (peers.size === 0) revertedPeers.delete(bump.package);
    }
  }

  // Clean stale dependency references from CHANGELOGs
  cleanChangelogs(revertedPeers, modifications);

  // Sync peer deps to dev deps
  syncPeerToDevDependencies(modifications);

  // Write all changes
  writeModifications(modifications);

  // Clear the bumps array in config
  clearBumpsInConfig();

  log(fmt.success("Done! Review the changes and commit manually."));
}

function printUsage(): void {
  console.log(`
bump-peers - Manage peer dependency bumps in this pnpm monorepo

DESCRIPTION
  This tool addresses the problem where changesets automatically bumps internal
  peer dependencies too aggressively. It works by:

  1. Reverting all workspace peer dependency changes made by changesets
  2. Applying only intentional bumps declared in ${CONFIG_FILE}
  3. Cleans up the "Updated dependencies" entry from the changelog when using
    the GitHub changelog generator (i.e. process.env.GITHUB_TOKEN is set). This
    does the following:
      - Removes any reverted bumps from the list of dependencies
      - Removes all the links from the "Updated dependencies" section, as
        cleaning them up is too complex to be worth it.

WORKFLOW
  1. Run \`pnpm changeset version --no-commit\`
  2. Run \`node scripts/bump-peers.ts apply\`
  3. Review changes and commit manually

EDGE CASES
  The tool validates that no pending changeset files exist (i.e., changesets
  have been consumed by \`pnpm changeset version --no-commit\`). If .md files
  other than README.md exist in .changeset/, the tool will fail with an error.

  The tool handles several edge cases when reverting peer dependencies:

  - Excluded packages: Packages in excludedFolders are skipped entirely and
    logged. This is useful for example projects or templates.

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
    "excludedFolders": ["v-next/example-project"],
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
  node scripts/bump-peers.ts          # Print usage
  node scripts/bump-peers.ts apply    # Apply peer dependency fixes
`);
}

// =============================================================================
// Core Workflow Functions
// =============================================================================

function revertPeerDependencies(
  packages: PnpmPackage[],
): Map<string, PackageModification> {
  logStep("Reverting peer dependency changes");

  const modifications: Map<string, PackageModification> = new Map();

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

    const previousPackageJson = JSON.parse(previousContent) as PackageJson;

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

function applyIntentionalBumps(
  bumps: PeerBump[],
  packageMap: Map<string, PnpmPackage>,
  excludedFolders: string[],
  modifications: Map<string, PackageModification>,
): void {
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
    let targetVersion: string;

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

function syncPeerToDevDependencies(
  modifications: Map<string, PackageModification>,
): void {
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

function writeModifications(
  modifications: Map<string, PackageModification>,
): void {
  logStep("Writing package.json files");

  for (const [pkgName, modification] of modifications) {
    writePackageJson(modification.packagePath, modification.packageJson);
    log(`  Updated ${fmt.pkg(pkgName)}`);
  }

  if (modifications.size === 0) {
    log(fmt.deemphasize("  No files to write"));
  }
}

function clearBumpsInConfig(): void {
  logStep("Clearing bumps in config");

  const config = loadConfig();
  config.bumps = [];

  const content = JSON.stringify(config, null, 2) + "\n";
  writeFileSync(CONFIG_PATH, content);

  log(`  Cleared bumps array in ${CONFIG_FILE}`);
}

// =============================================================================
// Changelog Cleanup
// =============================================================================

function cleanChangelogs(
  revertedPeers: Map<string, Set<string>>,
  modifications: Map<string, PackageModification>,
): void {
  logStep("Cleaning CHANGELOGs");
  if (process.env.GITHUB_TOKEN === undefined) {
    log(fmt.deemphasize("  Skipping changelog cleanup: GITHUB_TOKEN not set"));
    return;
  }

  // Collect all package paths that need changelog cleanup:
  // 1. Packages in modifications (may have reverted peers)
  // 2. All workspace packages (may have "Updated dependencies" sections to clean)
  const packagesToClean = new Map<string, /* reverted peers */ Set<string>>();

  // Add modified packages with their reverted peers
  for (const [pkgName, mod] of modifications) {
    const peers = revertedPeers.get(pkgName) ?? new Set<string>();
    packagesToClean.set(mod.packagePath, peers);
  }

  // Also scan all workspace packages for "Updated dependencies" sections
  const allPackages = getWorkspacePackages();
  const changedFiles = new Set(
    git(["diff", "--name-only", "HEAD", "--"])
      .split("\n")
      .filter((line) => line.length > 0),
  );
  for (const pkg of allPackages) {
    if (packagesToClean.has(pkg.path)) {
      continue;
    }

    // Normalize to POSIX separators so the comparison works on Windows,
    // where relative() uses "\" but git always uses "/".
    const relChangelog = relative(ROOT_DIR, resolve(pkg.path, "CHANGELOG.md"))
      .split("\\")
      .join("/");

    // If the package's CHANGELOG hasn't been modified, we skip it.
    if (!changedFiles.has(relChangelog)) {
      continue;
    }

    packagesToClean.set(pkg.path, new Set<string>());
  }

  for (const [packagePath, peers] of packagesToClean) {
    const changelogPath = resolve(packagePath, "CHANGELOG.md");
    if (!existsSync(changelogPath)) continue;

    const changelog = readFileSync(changelogPath, "utf-8");
    const { entry, startIndex, endIndex } = getLastChangelogEntry(changelog);
    if (entry === "") continue;

    // Only process if the entry has "Updated dependencies" sections
    if (!entry.includes("- Updated dependencies [")) continue;

    const cleanedEntry = cleanChangelogEntry(entry, peers);

    if (cleanedEntry !== entry) {
      const newChangelog =
        changelog.slice(0, startIndex) +
        cleanedEntry +
        changelog.slice(endIndex);
      writeFileSync(changelogPath, newChangelog);
      const pkgName = relative(ROOT_DIR, packagePath);
      log(`  Cleaned CHANGELOG for ${fmt.pkg(pkgName)}`);
    }
  }
}

export function getLastChangelogEntry(changelog: string): {
  entry: string;
  startIndex: number;
  endIndex: number;
} {
  const firstHeading = changelog.indexOf("\n## ");
  if (firstHeading === -1) {
    return { entry: "", startIndex: 0, endIndex: 0 };
  }

  const startIndex = firstHeading + 1; // skip the leading newline
  const nextHeading = changelog.indexOf("\n## ", startIndex);
  const endIndex = nextHeading === -1 ? changelog.length : nextHeading + 1;

  return {
    entry: changelog.slice(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

export function cleanChangelogEntry(
  entry: string,
  revertedPeers: Set<string>,
): string {
  // Match "- Updated dependencies [<links>]:" blocks followed by indented dep lines.
  // The leading \n is captured so it can be removed when the entire section is dropped.
  const updatedDepsPattern =
    /\n- Updated dependencies \[.*?\]:\n((?:  - .+\n)*)/gm;

  return entry.replace(updatedDepsPattern, (_match, depBlock: string) => {
    const depLines = depBlock.split("\n").filter((line) => line.length > 0);

    const keptLines = depLines.filter((line) => {
      // Extract package name from "  - @scope/pkg@version" or "  - pkg@version"
      const depMatch = line.match(/^\s{2}- (.+)@/);
      if (depMatch === null) return true;
      return !revertedPeers.has(depMatch[1]);
    });

    if (keptLines.length === 0) {
      // Remove the entire section including the preceding blank line
      return "";
    }

    return `\n- Updated dependencies:\n${keptLines.join("\n")}\n`;
  });
}

// =============================================================================
// Package Helpers
// =============================================================================

function getWorkspacePackages(): PnpmPackage[] {
  const output = pnpm(["ls", "-r", "--depth", "-1", "--json"]);
  return JSON.parse(output) as PnpmPackage[];
}

function filterPackages(
  packages: PnpmPackage[],
  excludedFolders: string[],
): PnpmPackage[] {
  const result: PnpmPackage[] = [];

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

function buildPackageMap(packages: PnpmPackage[]): Map<string, PnpmPackage> {
  const map: Map<string, PnpmPackage> = new Map();

  for (const pkg of packages) {
    map.set(pkg.name, pkg);
  }

  return map;
}

function readPackageJson(packagePath: string): PackageJson {
  const filePath = resolve(packagePath, "package.json");
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as PackageJson;
}

function writePackageJson(packagePath: string, json: PackageJson): void {
  const filePath = resolve(packagePath, "package.json");
  const content = JSON.stringify(json, null, 2) + "\n";
  writeFileSync(filePath, content);
}

function isWorkspaceDependency(version: string): boolean {
  return version.startsWith("workspace:");
}

function buildWorkspaceVersion(version: string): string {
  return `workspace:^${version}`;
}

// =============================================================================
// Git Helpers
// =============================================================================

function validateNoChangesets(): void {
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

function getFileFromCommit(ref: string, filePath: string): string | null {
  try {
    return git(["show", `${ref}:${filePath}`]);
  } catch {
    return null;
  }
}

// =============================================================================
// Config Helpers
// =============================================================================

function loadConfig(): PeerBumpsConfig {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found: ${CONFIG_FILE}\nCreate it with: { "excludedFolders": [], "bumps": [] }`,
    );
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");
  let config: unknown;

  try {
    config = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}`);
  }

  validateConfigSchema(config);
  return config as PeerBumpsConfig;
}

function validateConfigSchema(config: unknown): void {
  if (typeof config !== "object" || config === null) {
    throw new Error(`${CONFIG_FILE} must be an object`);
  }

  const obj = config as Record<string, unknown>;

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

    const bumpObj = bump as Record<string, unknown>;

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
// Shell Helpers
// =============================================================================

function which(command: string): string {
  return execSync(`which ${command}`, { encoding: "utf-8" }).trim();
}

function git(args: string[]): string {
  if (gitPath === undefined) {
    gitPath = which("git");
  }
  return execFileSync(gitPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
  }).trim();
}

function pnpm(args: string[]): string {
  if (pnpmPath === undefined) {
    pnpmPath = which("pnpm");
  }
  return execFileSync(pnpmPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
  }).trim();
}

// =============================================================================
// Logging Helpers
// =============================================================================

function log(msg: string): void {
  console.log(`${styleText("cyan", PREFIX)} ${msg}`);
}

function logStep(step: string): void {
  console.log(styleText(["bold", "yellow"], `${PREFIX} === ${step} ===`));
}

function logError(msg: string): void {
  console.error(styleText("red", `${PREFIX} Error: ${msg}`));
}

// =============================================================================
// Run
// =============================================================================

if (import.meta.main) {
  main();
}
