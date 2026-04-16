import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fmt, log, logStep } from "./helpers/logging.ts";
import {
  git,
  isVerdaccioRunning,
  npm,
  pnpm,
  ROOT_DIR,
  VERDACCIO_NPMRC,
  VERDACCIO_PID_FILE,
  VERDACCIO_URL,
} from "./helpers/shell.ts";

const PUBLISH_SUMMARY = resolve(ROOT_DIR, "pnpm-publish-summary.json");

const REGISTRY_ENV = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: VERDACCIO_NPMRC,
};

export function publish(changes: boolean, noGitChecks: boolean): void {
  if (!noGitChecks && !changes) {
    ensureCleanWorkingTree();
  }

  ensureVerdaccioRunning();

  let filterDirs: string[] | undefined;

  if (changes) {
    filterDirs = detectChangedPackages();

    if (filterDirs.length === 0) {
      log("No packages with uncommitted changes found under packages/.");
      return;
    }

    unpublishChanged(filterDirs);
  }

  publishPackages(filterDirs);
  reportPublished();
}

function ensureCleanWorkingTree(): void {
  const status = git(["status", "--porcelain"]);

  if (status !== "") {
    throw new Error(
      "Working tree has uncommitted changes.\n\n" +
        "Commit or stash your changes first, or run:\n" +
        "  git checkout .\n\n" +
        "To skip this check, pass --no-git-checks or --changes.",
    );
  }
}

function ensureVerdaccioRunning(): void {
  if (!isVerdaccioRunning()) {
    throw new Error(
      "Verdaccio is not running. Start it first with:\n" +
        "  pnpm verdaccio start",
    );
  }

  const pid = parseInt(readFileSync(VERDACCIO_PID_FILE, "utf-8").trim(), 10);

  try {
    // This is a check that the process is running
    process.kill(pid, 0);
  } catch {
    throw new Error(
      "Verdaccio process is not running (stale PID file). Start it with:\n" +
        "  pnpm verdaccio start",
    );
  }
}

function detectChangedPackages(): string[] {
  logStep("Detecting changed packages");

  const status = git(["status", "--porcelain", "--", "packages/"]);

  if (status === "") {
    return [];
  }

  const dirs = new Set<string>();

  for (const line of status.split("\n")) {
    // git() trims the output, so we can't rely on fixed column offsets.
    // Instead, find the "packages/" prefix and extract the package dir.
    const match = line.match(/packages\/([^/]+)/);

    if (match !== null) {
      dirs.add(`packages/${match[1]}`);
    }
  }

  const packageDirs = [...dirs];

  for (const dir of packageDirs) {
    const { name } = readPackageInfo(dir);

    log(`  ${fmt.pkg(name)} ${fmt.deemphasize(`(${dir})`)}`);
  }

  return packageDirs;
}

function readPackageInfo(packageDir: string): {
  name: string;
  version: string;
} {
  const pkgJson = JSON.parse(
    readFileSync(resolve(ROOT_DIR, packageDir, "package.json"), "utf-8"),
  );

  return { name: pkgJson.name, version: pkgJson.version };
}

function unpublishChanged(packageDirs: string[]): void {
  logStep("Unpublishing changed packages from Verdaccio");

  for (const dir of packageDirs) {
    const { name, version } = readPackageInfo(dir);
    const spec = `${name}@${version}`;

    try {
      npm(
        ["unpublish", spec, "--registry", VERDACCIO_URL],
        "pipe",
        REGISTRY_ENV,
      );

      log(`  ${fmt.deemphasize("unpublished")} ${fmt.pkg(spec)}`);
    } catch {
      // Package may not be published yet — that's fine
      log(`  ${fmt.deemphasize("not published")} ${fmt.pkg(spec)}`);
    }
  }
}

function publishPackages(filterDirs?: string[]): void {
  if (filterDirs !== undefined) {
    logStep("Publishing changed packages to Verdaccio");
  } else {
    logStep("Publishing all packages to Verdaccio");
  }

  const filterArgs =
    filterDirs !== undefined
      ? filterDirs.flatMap((dir) => ["--filter", `./${dir}`])
      : ["--filter", "./packages/**"];

  pnpm(
    [
      "publish",
      ...filterArgs,
      "-r",
      "--no-git-checks",
      "--access",
      "public",
      "--report-summary",
      "--registry",
      VERDACCIO_URL,
    ],
    "inherit",
    REGISTRY_ENV,
  );
}

function reportPublished(): void {
  logStep("Published packages");

  if (!existsSync(PUBLISH_SUMMARY)) {
    log(fmt.deemphasize("No pnpm-publish-summary.json found"));
    return;
  }

  const summary = JSON.parse(readFileSync(PUBLISH_SUMMARY, "utf-8")) as {
    publishedPackages: Array<{ name: string; version: string }>;
  };

  if (summary.publishedPackages.length === 0) {
    log(
      "No new packages were published. Package versions are compared against\n" +
        "  npm — if the same version already exists, it is skipped.\n\n" +
        "  To update versions add a changeset then run:\n" +
        "    pnpm version-for-release\n\n" +
        "  To re-publish packages with updated versions (filtered by those edited under git), run:\n" +
        "    pnpm verdaccio publish --changes",
    );

    return;
  }

  for (const pkg of summary.publishedPackages) {
    log(`  ${fmt.pkg(pkg.name)} ${fmt.version(pkg.version)}`);
  }

  log(
    fmt.success(
      `\n  ${summary.publishedPackages.length} package(s) published to ${VERDACCIO_URL}`,
    ),
  );
}

const EXCLUDED_PACKAGES = [
  "config",
  "example-project",
  "template-package",
  "hardhat-test-utils",
  "hardhat-solx",
];

/**
 * Detect packages that changed since their last release tag, bump their
 * patch version, and publish them to Verdaccio. This avoids the npm proxy
 * problem where pnpm publish skips versions that already exist on npm.
 */
export function sinceReleasePublish(): void {
  ensureVerdaccioRunning();

  const changedDirs = detectChangedSinceRelease();

  if (changedDirs.length === 0) {
    log("No packages changed since their last release.");
    return;
  }

  bumpPatchVersions(changedDirs);
  publishPackages(changedDirs);
  reportPublished();
}

function detectChangedSinceRelease(): string[] {
  logStep("Detecting packages changed since release");

  const packagesDir = resolve(ROOT_DIR, "packages");
  const changedDirs: string[] = [];

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED_PACKAGES.includes(entry.name)) {
      continue;
    }

    const packageDir = `packages/${entry.name}`;
    const pkgJsonPath = resolve(ROOT_DIR, packageDir, "package.json");

    if (!existsSync(pkgJsonPath)) {
      continue;
    }

    const { name, version } = readPackageInfo(packageDir);

    // Find the latest existing release tag for this package
    const releaseTag = findLatestReleaseTag(name);

    const tagVersion =
      releaseTag !== undefined
        ? releaseTag.slice(name.length + 1) // "hardhat@3.3.0" → "3.3.0"
        : undefined;

    const excludePatterns = [
      `:!${packageDir}/package.json`,
      `:!${packageDir}/CHANGELOG.md`,
    ];

    const hasCodeChangesSinceRelease =
      releaseTag !== undefined &&
      git([
        "diff",
        "--name-only",
        releaseTag,
        "--",
        packageDir,
        ...excludePatterns,
      ]) !== "";

    const hasUncommittedCodeChanges =
      git([
        "diff",
        "--name-only",
        "HEAD",
        "--",
        packageDir,
        ...excludePatterns,
      ]) !== "";

    if (
      !shouldPublishSinceLastRelease(
        tagVersion,
        version,
        hasCodeChangesSinceRelease,
        hasUncommittedCodeChanges,
      )
    ) {
      continue;
    }

    if (tagVersion === undefined) {
      log(`  ${fmt.pkg(name)} ${fmt.deemphasize("(no release tag)")}`);
    } else if (version !== tagVersion) {
      log(
        `  ${fmt.pkg(name)} ${fmt.deemphasize("(new changes since last bump)")}`,
      );
    } else {
      log(
        `  ${fmt.pkg(name)} ${fmt.deemphasize(`(changed since ${releaseTag})`)}`,
      );
    }

    changedDirs.push(packageDir);
  }

  if (changedDirs.length === 0) {
    return [];
  }

  log(
    fmt.success(`\n  ${changedDirs.length} package(s) changed since release`),
  );

  return changedDirs;
}

/**
 * Find the latest release tag for a package by listing all tags matching
 * `<name>@*` and picking the most recent by version sort.
 */
function findLatestReleaseTag(packageName: string): string | undefined {
  try {
    const tags = git([
      "tag",
      "--list",
      `${packageName}@*`,
      "--sort=-v:refname",
    ]);

    if (tags === "") {
      return undefined;
    }

    // First line is the latest tag
    return tags.split("\n")[0];
  } catch {
    return undefined;
  }
}

/**
 * Pure decision function for --use-local / --since-release: should a
 * package be bumped and published to Verdaccio?
 *
 * - No release tag → always publish (new package)
 * - Already bumped (version differs from tag) → only if new uncommitted changes
 * - Not bumped (version matches tag) → if code changed since release
 */
export function shouldPublishSinceLastRelease(
  releaseTagVersion: string | undefined,
  currentVersion: string,
  hasCodeChangesSinceRelease: boolean,
  hasUncommittedCodeChanges: boolean,
): boolean {
  if (releaseTagVersion === undefined) {
    return true;
  }

  if (currentVersion !== releaseTagVersion) {
    return hasUncommittedCodeChanges;
  }

  return hasCodeChangesSinceRelease;
}

function bumpPatchVersions(packageDirs: string[]): void {
  logStep("Bumping patch versions");

  for (const dir of packageDirs) {
    const pkgJsonPath = resolve(ROOT_DIR, dir, "package.json");
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    const oldVersion: string = pkgJson.version;

    const parts = oldVersion.split(".");
    parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
    const newVersion = parts.join(".");

    pkgJson.version = newVersion;
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

    log(
      `  ${fmt.pkg(pkgJson.name)} ${fmt.deemphasize(oldVersion)} → ${fmt.version(newVersion)}`,
    );
  }
}
