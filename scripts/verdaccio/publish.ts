import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
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
  satisfiesCaret,
} from "./helpers/version.ts";

const PUBLISH_SUMMARY = resolve(ROOT_DIR, "pnpm-publish-summary.json");

const LOCKFILE = "pnpm-lock.yaml";

const WORKSPACE_PROTOCOL = "workspace:";
const WORKSPACE_CARET = `${WORKSPACE_PROTOCOL}^`;

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

/** The one section a package's consumers never install from. */
const DEV_SECTION: DependencySection = "devDependencies";

/** A package.json, typed only where this script reads or writes it. */
export interface PackageJson extends Partial<
  Record<DependencySection, Record<string, string>>
> {
  name: string;
  version: string;
  private?: boolean;
  [field: string]: unknown;
}

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

function readPackageJson(packageDir: string): PackageJson {
  return JSON.parse(readFileSync(packageJsonPath(packageDir), "utf-8"));
}

function writePackageJson(packageDir: string, packageJson: PackageJson): void {
  writeFileSync(
    packageJsonPath(packageDir),
    JSON.stringify(packageJson, null, 2) + "\n",
  );
}

function readPackageInfo(packageDir: string): PackageVersion & {
  private: boolean;
} {
  const pkgJsonPath = packageJsonPath(packageDir);
  const pkgJson = readPackageJson(packageDir);

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

export interface PublishTarget {
  packageDir: string;
  name: string;
  currentVersion: string;
  /** The version scenarios must install, republished or not. */
  version: string;
  action: PublishAction;
  reason: string;
}

/** A package and the version it is being published under instead. */
type RaisedVersion = Pick<PublishTarget, "currentVersion" | "version">;

/** One workspace range moved up to the version that outgrew it. */
interface RangeRaise {
  section: DependencySection;
  dependency: string;
  from: string;
  to: string;
}

/** A package.json with its ranges raised, and what moved. */
interface PackageJsonRewrite {
  packageJson: PackageJson;
  raises: RangeRaise[];
}

/**
 * Publish the packages that changed since their last release, each published
 * a minor above npm's release of it.
 *
 * That raise is what makes the local build win. pnpm skips a version that npm
 * already has, and Verdaccio serves the uplink's `dist-tags.latest` whenever
 * the local version doesn't exceed it.
 *
 * The same uplink answers for every range a published package declares, so a
 * raise that crosses a major takes the ranges it outgrew with it. See
 * `raiseWorkspaceRanges`.
 */
export async function sinceReleasePublish(): Promise<void> {
  ensureVerdaccioRunning();

  const targets = await detectChangedSinceRelease();
  const rewrites = rewriteOutgrownRanges(targets);

  promoteStaleDependents(targets, namesStaleOnNpm(rewrites.values()));
  logTargets(targets);

  const toPublish = targets.filter((target) => target.action === "publish");

  if (toPublish.length === 0) {
    log("No packages changed since their last release.");
    return;
  }

  const written: string[] = [];

  try {
    writePackageJsonFiles(toPublish, rewrites, written);

    if (rewrites.size > 0) {
      written.push(LOCKFILE);
      syncLockfile(written);
    }

    unpublish(toPublish);
    publishPackages(toPublish.map((target) => target.packageDir));
    ensurePublishedLocally(toPublish);
  } catch (error) {
    throw withRestoreHint(error, written);
  }

  reportPublished(readPublishSummary());
}

/**
 * Bring the lockfile in line with the raised ranges, and name every file
 * `written` so far for restoring.
 *
 * The lockfile records each workspace range as written, so a raised range
 * leaves it outdated. pnpm then attempts a reinstall before every package
 * script. On CI installs are frozen, so each attempt fails and pnpm warns
 * before going on. Keep the raised ranges linking workspace packages only,
 * so that this resolves nothing from a registry.
 */
function syncLockfile(written: string[]): void {
  logStep(`Syncing ${LOCKFILE} with the raised ranges`);

  pnpm(["install", "--no-frozen-lockfile"], "inherit");

  log(
    `  Restore what this run wrote with:\n` +
      `    git checkout -- ${restorePaths(written)}`,
  );
}

function wasRewritten(target: PublishTarget): boolean {
  return target.version !== target.currentVersion;
}

/**
 * Every workspace package.json whose ranges a published version outgrew, by dir.
 *
 * A version published as it stands counts too. EDR writes such a version
 * into hardhat's package.json, and it can sit across a major from the ranges
 * the checkout declares on hardhat.
 */
function rewriteOutgrownRanges(
  targets: PublishTarget[],
): Map<string, PackageJsonRewrite> {
  const raised = new Map(
    targets
      .filter((target) => target.action === "publish")
      .map((target) => [target.name, target]),
  );
  const rewrites = new Map<string, PackageJsonRewrite>();

  for (const packageDir of listWorkspaceDirs()) {
    const rewrite = raiseWorkspaceRanges(readPackageJson(packageDir), raised);

    if (rewrite.raises.length > 0) {
      rewrites.set(packageDir, rewrite);
    }
  }

  return rewrites;
}

/**
 * A copy of `packageJson` in which each workspace range outgrown by a published
 * version now starts at that version, plus the list of moves.
 *
 * pnpm publishes `workspace:^4.4.0` verbatim as `^4.4.0`. A dependency is
 * raised across a major when npm released one that this checkout has not
 * caught up with, and then falls outside such a range. The published
 * dependent resolves the range to npm's old major through Verdaccio's uplink,
 * which is the build the raise exists to outrank.
 *
 * A range the raised version still satisfies is left alone, which keeps peer
 * ranges as wide as the release left them. A raise never drops below the
 * version a range was written against, so the only way out of a range is
 * across a major.
 *
 * pnpm fills a bare `workspace:^` with the dependency's version at publish,
 * so a published bare range never falls behind. A skipped dependent's npm
 * release filled the range with the dependency's pre-raise version, so that
 * is the floor. The range is made explicit once it is outgrown.
 */
export function raiseWorkspaceRanges(
  packageJson: PackageJson,
  raised: ReadonlyMap<string, RaisedVersion>,
): PackageJsonRewrite {
  const result = structuredClone(packageJson);
  const raises: RangeRaise[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const ranges = result[section];

    if (ranges === undefined) {
      continue;
    }

    for (const [dependency, range] of Object.entries(ranges)) {
      const target = raised.get(dependency);

      if (target === undefined || !range.startsWith(WORKSPACE_PROTOCOL)) {
        continue;
      }

      const floor = workspaceCaretFloor(dependency, range, target);

      if (satisfiesCaret(target.version, floor)) {
        continue;
      }

      const to = `${WORKSPACE_CARET}${target.version}`;

      ranges[dependency] = to;
      raises.push({ section, dependency, from: range, to });
    }
  }

  return { packageJson: result, raises };
}

/**
 * The version a `workspace:^` range starts at.
 *
 * Only caret ranges are raised. pnpm publishes each other workspace form
 * differently, so meeting one fails the run rather than publishing a range
 * the raise may have left behind.
 */
function workspaceCaretFloor(
  dependency: string,
  range: string,
  { currentVersion }: RaisedVersion,
): string {
  if (!range.startsWith(WORKSPACE_CARET)) {
    throw new Error(
      `Cannot raise ${dependency}@${range}: only ${WORKSPACE_CARET} ranges are supported`,
    );
  }

  const floor = range.slice(WORKSPACE_CARET.length);

  return floor === "" ? currentVersion : floor;
}

/**
 * The packages whose npm release now declares an outgrown range.
 *
 * A consumer never installs from `devDependencies`, so a move there leaves
 * the release usable.
 */
export function namesStaleOnNpm(
  rewrites: Iterable<PackageJsonRewrite>,
): Set<string> {
  const names = new Set<string>();

  for (const { packageJson, raises } of rewrites) {
    if (raises.some((raise) => raise.section !== DEV_SECTION)) {
      names.add(packageJson.name);
    }
  }

  return names;
}

/**
 * Republish each skipped target named in `stale`, a minor above its release.
 *
 * A skipped target leaves scenarios to its npm release, whose ranges predate
 * the raise, so it would pull the old major from the uplink. Skipping requires
 * the checkout to match that release, so a minor above the checkout outranks
 * it. That raise stays inside the caret of the checkout's version from `1.0.0`
 * up, so it cannot outgrow a range on the promoted package in turn. One pass
 * over the ranges is therefore enough. A `0.x` package fails the run instead,
 * because its minor bump leaves its own caret.
 */
export function promoteStaleDependents(
  targets: PublishTarget[],
  stale: ReadonlySet<string>,
): void {
  for (const target of targets) {
    if (target.action !== "skip" || !stale.has(target.name)) {
      continue;
    }

    const version = minorBump(target.currentVersion);

    if (!satisfiesCaret(version, target.currentVersion)) {
      throw new Error(
        `Cannot republish ${target.name}@${target.currentVersion} as ${version}: ` +
          "that leaves the ranges declared on it, and nothing raises those in turn",
      );
    }

    target.action = "publish";
    target.version = version;
    target.reason = "(republished because its ranges were raised)";
  }
}

function logTargets(targets: PublishTarget[]): void {
  for (const { name, version, reason } of targets) {
    log(
      `  ${fmt.pkg(name)} ${fmt.version(version)} ${fmt.deemphasize(reason)}`,
    );
  }
}

/**
 * `error`, naming the files this run rewrote so far. Only those may be
 * restored, since the rest can hold edits this run never made.
 */
function withRestoreHint(error: unknown, written: string[]): Error {
  const failure = error instanceof Error ? error : new Error(String(error));

  if (written.length === 0) {
    return failure;
  }

  return new Error(
    `${failure.message}\n\n` +
      `  ${written.length} file(s) still carry what this run wrote.\n` +
      "  To restore them:\n" +
      `    git checkout -- ${restorePaths(written)}`,
    { cause: failure },
  );
}

/** The paths to restore, with each package dir standing for its package.json. */
function restorePaths(written: string[]): string {
  return written
    .map((path) => (path === LOCKFILE ? path : `${path}/package.json`))
    .join(" ");
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

/**
 * Every workspace project's directory relative to the repo root, in path
 * order, as pnpm resolves them from `pnpm-workspace.yaml`.
 *
 * Keep this the full workspace rather than `packages/*`. An install resolves
 * every project's workspace ranges, and the templates under
 * `packages/hardhat/templates/` declare such ranges too.
 */
function listWorkspaceDirs(): string[] {
  const projects = JSON.parse(
    pnpm(["--recursive", "ls", "--depth", "-1", "--json"], "pipe"),
  ) as Array<{ path: string }>;

  return projects
    .map((project) => relative(ROOT_DIR, project.path) || ".")
    .sort();
}

/** A target for every public package, in directory order. */
async function detectChangedSinceRelease(): Promise<PublishTarget[]> {
  logStep("Detecting packages changed since release");

  // pnpm never publishes a private package, so a version written for one
  // would name a tarball no scenario can install.
  const packageDirs = listWorkspaceDirs().filter(
    (packageDir) => !readPackageInfo(packageDir).private,
  );

  return Promise.all(packageDirs.map(resolveTarget));
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

/**
 * Write each raised version and range into its package.json, recording in
 * `written` the package dirs whose package.json changed.
 */
function writePackageJsonFiles(
  targets: PublishTarget[],
  rewrites: ReadonlyMap<string, PackageJsonRewrite>,
  written: string[],
): void {
  const raisedByDir = new Map(
    targets.filter(wasRewritten).map((target) => [target.packageDir, target]),
  );
  const packageDirs = [
    ...new Set([...raisedByDir.keys(), ...rewrites.keys()]),
  ].sort();

  if (packageDirs.length === 0) {
    return;
  }

  logStep("Writing publish versions and raised ranges");

  for (const packageDir of packageDirs) {
    const target = raisedByDir.get(packageDir);
    const rewrite = rewrites.get(packageDir);
    const packageJson = rewrite?.packageJson ?? readPackageJson(packageDir);

    if (target !== undefined) {
      packageJson.version = target.version;
    }

    writePackageJson(packageDir, packageJson);
    written.push(packageDir);

    const version =
      target !== undefined
        ? `${fmt.deemphasize(target.currentVersion)} → ${fmt.version(target.version)}`
        : fmt.deemphasize(packageJson.version);

    log(`  ${fmt.pkg(packageJson.name)} ${version}`);

    for (const { section, dependency, from, to } of rewrite?.raises ?? []) {
      log(
        `    ${fmt.deemphasize(`${section}.`)}${fmt.pkg(dependency)} ${fmt.deemphasize(from)} → ${fmt.version(to)}`,
      );
    }
  }
}
