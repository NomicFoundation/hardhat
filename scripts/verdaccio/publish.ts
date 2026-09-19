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
  VERDACCIO_STORAGE,
  VERDACCIO_URL,
} from "./helpers/shell.ts";
import {
  compareVersions,
  isRelease,
  minorBump,
  npmLatestVersion,
  patchBump,
} from "./helpers/version.ts";

const PUBLISH_SUMMARY = resolve(ROOT_DIR, "pnpm-publish-summary.json");

const PACKAGES_DIR = "packages";

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

  reportPublished(readPublishSummary());
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

function packageJsonPath(packageDir: string): string {
  return resolve(ROOT_DIR, packageDir, "package.json");
}

function readManifest(packageDir: string) {
  return JSON.parse(readFileSync(packageJsonPath(packageDir), "utf-8"));
}

function readPackageInfo(packageDir: string): PackageVersion & {
  private: boolean;
} {
  const pkgJsonPath = packageJsonPath(packageDir);
  const pkgJson = readManifest(packageDir);

  for (const field of ["name", "version"]) {
    if (typeof pkgJson[field] !== "string" || pkgJson[field] === "") {
      throw new Error(`${pkgJsonPath} has no ${field}`);
    }
  }

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

/** `undefined` when pnpm wrote no summary at all. */
function readPublishSummary(): PackageVersion[] | undefined {
  if (!existsSync(PUBLISH_SUMMARY)) {
    return undefined;
  }

  const summary = JSON.parse(readFileSync(PUBLISH_SUMMARY, "utf-8")) as {
    publishedPackages?: PackageVersion[];
  };

  if (summary === null || !Array.isArray(summary.publishedPackages)) {
    return [];
  }

  return summary.publishedPackages;
}

function reportPublished(
  publishedPackages: PackageVersion[] | undefined,
): void {
  logStep("Published packages");

  if (publishedPackages === undefined) {
    log(fmt.deemphasize("No pnpm-publish-summary.json found"));
    return;
  }

  if (publishedPackages.length === 0) {
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

  for (const pkg of publishedPackages) {
    log(`  ${fmt.pkg(pkg.name)} ${fmt.version(pkg.version)}`);
  }

  log(
    fmt.success(
      `\n  ${publishedPackages.length} package(s) published to ${VERDACCIO_URL}`,
    ),
  );
}
/** A package and the version it is available under. */
interface PackageVersion {
  name: string;
  version: string;
}

/**
 * Whether a package is republished, or left at the version already released.
 */
type PublishAction = "publish" | "skip";

interface PublishTarget {
  packageDir: string;
  name: string;
  currentVersion: string;
  /** The version scenarios must install, republished or not. */
  version: string;
  action: PublishAction;
  reason: string;
}

/**
 * Publish the packages that changed since their last release, each published
 * a minor above npm's release of it.
 *
 * That raise is what makes the local build win. pnpm skips a version that npm
 * already has, and Verdaccio serves the uplink's `dist-tags.latest` whenever
 * the local version doesn't exceed it.
 */
export async function sinceReleasePublish(): Promise<void> {
  ensureVerdaccioRunning();

  const targets = await detectChangedSinceRelease();
  const toPublish = targets.filter((target) => target.action === "publish");

  if (toPublish.length === 0) {
    log("No packages changed since their last release.");
    return;
  }

  try {
    writeVersions(toPublish);
    unpublish(toPublish);
    publishPackages(toPublish.map((target) => target.packageDir));
    ensurePublishedLocally(toPublish);
  } catch (error) {
    throw withRestoreHint(error, toPublish);
  }

  reportPublished(readPublishSummary());
}

function wasRewritten(target: PublishTarget): boolean {
  return target.version !== target.currentVersion;
}

function withRestoreHint(error: unknown, targets: PublishTarget[]): Error {
  const failure = error instanceof Error ? error : new Error(String(error));
  const written = targets.filter(wasRewritten);

  if (written.length === 0) {
    return failure;
  }

  const paths = written
    .map((target) => `${target.packageDir}/package.json`)
    .join(" ");

  return new Error(
    `${failure.message}\n\n` +
      `  ${written.length} package.json file(s) still carry the version this run wrote.\n` +
      "  To restore them:\n" +
      `    git checkout -- ${paths}`,
    { cause: failure },
  );
}

/**
 * Drop each target from the registry before republishing it.
 *
 * Verdaccio keeps a tarball until it is unpublished, and pnpm skips a version
 * the registry already answers for. Without this, a second publish into a
 * running registry would leave the earlier build in place and pass every check.
 */
function unpublish(targets: PublishTarget[]): void {
  for (const { name, version } of targets) {
    try {
      npm(
        ["unpublish", `${name}@${version}`, "--registry", VERDACCIO_URL],
        "pipe",
        REGISTRY_ENV,
      );
    } catch {
      // Usually just "not published yet", but a real failure would leave the
      // earlier tarball for `ensurePublishedLocally` to accept.
      if (existsSync(storedTarball(VERDACCIO_STORAGE, name, version))) {
        throw new Error(
          `Could not drop ${name}@${version} from ${VERDACCIO_URL}, ` +
            "so a stale build would be republished under it.",
        );
      }
    }
  }
}

/**
 * Fail on any target whose tarball is not in the registry's own storage.
 *
 * pnpm exits 0 on a version it believes is already published, which it settles
 * by resolving through the publish registry. Verdaccio answers for its npm
 * uplink, and pnpm's metadata cache answers for registries that no longer
 * exist. A silent skip therefore does not mean the local build is there.
 *
 * Every target is dropped from the registry first, so a tarball on disk can
 * only be the one this run wrote.
 */
export function ensurePublishedLocally(
  targets: PackageVersion[],
  storageDir: string = VERDACCIO_STORAGE,
): void {
  const missing = targets.filter(
    (target) =>
      !existsSync(storedTarball(storageDir, target.name, target.version)),
  );

  if (missing.length === 0) {
    return;
  }

  const specs = missing
    .map((target) => `${target.name}@${target.version}`)
    .join("\n    ");

  throw new Error(
    `pnpm did not publish these to ${VERDACCIO_URL}:\n    ${specs}\n\n` +
      "  Scenarios would install npm's build instead of this one. pnpm skips a\n" +
      "  version it believes is published, so either npm already serves it, or\n" +
      "  a stale metadata cache does. Clear the cache and retry:\n" +
      "    rm -rf ~/.cache/pnpm",
  );
}

/** Where Verdaccio writes a package's tarball once it is published to it. */
function storedTarball(
  storageDir: string,
  name: string,
  version: string,
): string {
  const unscoped = name.slice(name.indexOf("/") + 1);

  return resolve(storageDir, name, `${unscoped}-${version}.tgz`);
}

async function detectChangedSinceRelease(): Promise<PublishTarget[]> {
  logStep("Detecting packages changed since release");

  const packagesDir = resolve(ROOT_DIR, PACKAGES_DIR);
  const packageDirs: string[] = [];

  const entries = readdirSync(packagesDir, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const packageDir = `${PACKAGES_DIR}/${entry.name}`;

    if (
      !entry.isDirectory() ||
      !existsSync(resolve(ROOT_DIR, packageDir, "package.json"))
    ) {
      continue;
    }

    // pnpm never publishes a private package, so a version written for one
    // would name a tarball no scenario can install.
    if (!readPackageInfo(packageDir).private) {
      packageDirs.push(packageDir);
    }
  }

  const targets = await Promise.all(packageDirs.map(resolveTarget));

  // Logged after the fan-out, so the listing keeps directory order instead of
  // the order the npm lookups happened to finish in.
  for (const { name, version, reason } of targets) {
    log(
      `  ${fmt.pkg(name)} ${fmt.version(version)} ${fmt.deemphasize(reason)}`,
    );
  }

  return targets;
}

async function resolveTarget(packageDir: string): Promise<PublishTarget> {
  const { name, version: currentVersion } = readPackageInfo(packageDir);

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

  const npmLatest = await npmLatestVersion(name);

  const resolved = resolvePublishVersion(
    currentVersion,
    tagVersion,
    npmLatest,
    hasCodeChangesSinceRelease,
  );

  if (resolved === undefined) {
    return {
      packageDir,
      name,
      currentVersion,
      version: currentVersion,
      action: "skip",
      reason: `(unchanged since ${releaseTag})`,
    };
  }

  return {
    packageDir,
    name,
    currentVersion,
    version: resolved,
    action: "publish",
    reason:
      npmLatest === undefined
        ? "(not released on npm)"
        : resolved === currentVersion
          ? `(already ahead of npm ${npmLatest})`
          : `(raised above npm ${npmLatest})`,
  };
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
 * The version to publish a package under, or `undefined` when npm's release
 * already is this code.
 *
 * The result has to exceed npm's release, which a checkout can lag by a whole
 * version. Only npm sets the floor, which exists to outrank Verdaccio's
 * uplink. A release tag only says whether the code changed.
 *
 * Raising by a minor rather than a patch keeps the local build ahead of a
 * release that lands on npm during the run, which would otherwise take back
 * `dist-tags.latest`. The floor is read once, so a second release in the same
 * run would still take it back.
 *
 * Keep `currentVersion` out of that floor, so a version already ahead is
 * published as-is. Such a version keeps only the lead it already had, which
 * may be narrower than a raise.
 */
export function resolvePublishVersion(
  currentVersion: string,
  releaseTagVersion: string | undefined,
  npmLatest: string | undefined,
  hasCodeChangesSinceRelease: boolean,
): string | undefined {
  // Nothing on npm to outrank, or already past it. Raising here would walk
  // the version up on every run, because the raise is written back to disk.
  if (
    npmLatest === undefined ||
    compareVersions(currentVersion, npmLatest) > 0
  ) {
    // Scenarios resolve plugin peer ranges against whatever is pinned, and
    // node-semver excludes prereleases from those.
    return isRelease(currentVersion)
      ? currentVersion
      : patchBump(currentVersion);
  }

  // Skipping pins the version without publishing it, so npm has to be serving
  // that exact release. `hasCodeChangesSinceRelease` is a diff against the tag,
  // so without one it reads `false` for "unknown" rather than "unchanged".
  const releaseIsThisCode =
    currentVersion === releaseTagVersion &&
    currentVersion === npmLatest &&
    isRelease(currentVersion) &&
    !hasCodeChangesSinceRelease;

  if (releaseIsThisCode) {
    return undefined;
  }

  return minorBump(npmLatest);
}

function writeVersions(targets: PublishTarget[]): void {
  const toWrite = targets.filter(wasRewritten);

  if (toWrite.length === 0) {
    return;
  }

  logStep("Writing publish versions");

  for (const { packageDir, currentVersion, version } of toWrite) {
    const pkgJson = readManifest(packageDir);

    pkgJson.version = version;
    writeFileSync(
      packageJsonPath(packageDir),
      JSON.stringify(pkgJson, null, 2) + "\n",
    );

    log(
      `  ${fmt.pkg(pkgJson.name)} ${fmt.deemphasize(currentVersion)} → ${fmt.version(version)}`,
    );
  }
}
