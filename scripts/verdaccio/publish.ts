import { existsSync, readFileSync } from "node:fs";
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
