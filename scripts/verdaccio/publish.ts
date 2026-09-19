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

/** A package and the version it is available under. */
interface PackageVersion {
  name: string;
  version: string;
}

function packageJsonPath(packageDir: string): string {
  return resolve(ROOT_DIR, packageDir, "package.json");
}

function readManifest(packageDir: string) {
  return JSON.parse(readFileSync(packageJsonPath(packageDir), "utf-8"));
}

function readPackageInfo(packageDir: string): PackageVersion & {
  private: boolean;
} {
  const pkgJson = readManifest(packageDir);

  return {
    name: pkgJson.name,
    version: pkgJson.version,
    private: pkgJson.private === true,
  };
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

const PACKAGES_DIR = "packages";

/**
 * Detect packages that changed since their last release tag, bump their
 * patch version, and publish them to Verdaccio. This avoids the npm proxy
 * problem where pnpm publish skips versions that already exist on npm.
 */
export function sinceReleasePublish(): void {
  ensureVerdaccioRunning();

  const { toBump, toPublishOnly } = detectChangedSinceRelease();

  if (toBump.length === 0 && toPublishOnly.length === 0) {
    log("No packages changed since their last release.");
    return;
  }

  bumpPatchVersions(toBump);
  publishPackages([...toBump, ...toPublishOnly]);
  reportPublished();
}

function detectChangedSinceRelease(): {
  toBump: string[];
  toPublishOnly: string[];
} {
  logStep("Detecting packages changed since release");

  const packagesDir = resolve(ROOT_DIR, PACKAGES_DIR);
  const toBump: string[] = [];
  const toPublishOnly: string[] = [];

  // readdirSync returns filesystem order, which differs between machines.
  const entries = readdirSync(packagesDir, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const packageDir = `${PACKAGES_DIR}/${entry.name}`;

    if (!entry.isDirectory() || !existsSync(packageJsonPath(packageDir))) {
      continue;
    }

    // pnpm never publishes a private package, so a version written for one
    // would name a tarball no scenario can install.
    if (readPackageInfo(packageDir).private) {
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

    const action = decidePublishAction(
      tagVersion,
      version,
      hasCodeChangesSinceRelease,
    );

    if (action === "skip") {
      continue;
    }

    if (action === "bump") {
      const reason =
        tagVersion === undefined
          ? "(no release tag)"
          : `(changed since ${releaseTag})`;
      log(`  ${fmt.pkg(name)} ${fmt.deemphasize(reason)}`);
      toBump.push(packageDir);
    } else {
      log(
        `  ${fmt.pkg(name)} ${fmt.deemphasize(`(already bumped to ${version})`)}`,
      );
      toPublishOnly.push(packageDir);
    }
  }

  const total = toBump.length + toPublishOnly.length;

  if (total > 0) {
    log(fmt.success(`\n  ${total} package(s) changed since release`));
  }

  return { toBump, toPublishOnly };
}

/**
 * Find the latest release tag for a package by listing all tags matching
 * `<name>@*` and picking the most recent by version sort.
 */
function findLatestReleaseTag(packageName: string): string | undefined {
  try {
    const tags = git([
      "-c",
      "versionsort.suffix=-",
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
 * Pure decision function for --use-local / --since-release: what action
 * should be taken for a given package?
 *
 * - No release tag → bump (new package)
 * - Already bumped (version differs from tag) → publish current version
 *   without bumping (Verdaccio storage is wiped per run, so we always
 *   need to (re)publish, but the on-disk version was already bumped on a
 *   prior run and shouldn't compound)
 * - Not bumped + code changed since release → bump
 * - Not bumped + no code changes → skip
 */
export function decidePublishAction(
  releaseTagVersion: string | undefined,
  currentVersion: string,
  hasCodeChangesSinceRelease: boolean,
): "bump" | "publish" | "skip" {
  if (releaseTagVersion === undefined) {
    return "bump";
  }

  if (currentVersion !== releaseTagVersion) {
    return "publish";
  }

  return hasCodeChangesSinceRelease ? "bump" : "skip";
}

function bumpPatchVersions(packageDirs: string[]): void {
  logStep("Bumping patch versions");

  for (const dir of packageDirs) {
    const pkgJson = readManifest(dir);
    const oldVersion: string = pkgJson.version;

    const parts = oldVersion.split(".");
    parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
    const newVersion = parts.join(".");

    pkgJson.version = newVersion;
    writeFileSync(
      packageJsonPath(dir),
      JSON.stringify(pkgJson, null, 2) + "\n",
    );

    log(
      `  ${fmt.pkg(pkgJson.name)} ${fmt.deemphasize(oldVersion)} → ${fmt.version(newVersion)}`,
    );
  }
}
