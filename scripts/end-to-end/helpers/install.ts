import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { which } from "./shell.ts";
import { log, logStep } from "./log.ts";

import { ROOT_DIR, VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import type { ScenarioDefinition } from "../types.ts";

/**
 * Configure the registry to point at Verdaccio and run `install` for
 * the scenario's package manager.
 */
export function installDependencies(
  workDir: string,
  packageManager: ScenarioDefinition["packageManager"],
  env?: Record<string, string>,
): void {
  logStep("Installing dependencies");

  runPackageManager(
    workDir,
    packageManager,
    getInstallArgs(packageManager, VERDACCIO_URL),
    env,
  );
}

/**
 * Update the scenario's local (`hardhat` / `@nomicfoundation/*`) dependencies to
 * the given `name@version` specs using the scenario's package manager.
 */
export function updateDependencies(
  workDir: string,
  packageManager: ScenarioDefinition["packageManager"],
  specs: string[],
  env?: Record<string, string>,
): void {
  logStep("Updating local dependencies");

  runPackageManager(
    workDir,
    packageManager,
    getUpdateArgs(packageManager, specs, VERDACCIO_URL),
    env,
  );
}

/**
 * Point the scenario's package manager at Verdaccio and run it with `args`.
 * Shared by install and targeted-update so both get the same registry config,
 * corepack bootstrap (yarn), and environment.
 */
function runPackageManager(
  workDir: string,
  packageManager: ScenarioDefinition["packageManager"],
  args: string[],
  env?: Record<string, string>,
): void {
  writeRegistryConfig(workDir, packageManager);

  if (packageManager === "yarn") {
    logStep("Enabling corepack for yarn");

    execFileSync(which("corepack"), ["enable", "yarn"], {
      cwd: workDir,
      stdio: "inherit",
    });

    evictLocalPackagesFromYarnCache(
      workDir,
      buildPackageManagerEnv(packageManager, env),
    );
  }

  execFileSync(which(packageManager), args, {
    cwd: workDir,
    stdio: "inherit",
    env: buildPackageManagerEnv(packageManager, env),
  });
}

/**
 * Drop the monorepo's packages from Yarn Berry's caches and from the
 * scenario's node_modules before an install.
 *
 * Verdaccio republishes them under versions that repeat across runs (a
 * package missing from npm keeps its own version) with new contents, and
 * Berry reuses a cached zip by name and version when the lockfile has no
 * checksum for it, which a scenario lockfile never has. It also takes a
 * version's dependencies from cached registry metadata that lists that
 * version, and leaves an installed package in place while its version is
 * unchanged. A persistent runner would then install, or keep, a previous
 * run's build or dependency ranges. Yarn Classic checks the registry's
 * shasum, so it needs nothing.
 */
function evictLocalPackagesFromYarnCache(
  workDir: string,
  env: NodeJS.ProcessEnv,
): void {
  const yarn = (args: string[]) =>
    execFileSync(which("yarn"), args, {
      cwd: workDir,
      env,
      encoding: "utf8",
    }).trim();

  if (Number(yarn(["--version"]).split(".")[0]) < 2) {
    return;
  }

  // The global cache is used unless enableGlobalCache is off; clear both.
  const cacheDirs = [
    resolve(workDir, yarn(["config", "get", "cacheFolder"])),
    resolve(yarn(["config", "get", "globalFolder"]), "cache"),
  ];
  const names = localPackageNames();

  for (const dir of cacheDirs) {
    if (!existsSync(dir)) {
      continue;
    }
    const stale = readdirSync(dir).filter((file) =>
      isYarnCacheEntryOf(file, names),
    );
    for (const file of stale) {
      rmSync(resolve(dir, file));
    }
    if (stale.length > 0) {
      log(`Evicted ${stale.length} local package(s) from ${dir}`);
    }
  }

  const metadataDir = resolve(
    yarn(["config", "get", "globalFolder"]),
    "metadata",
  );
  const evicted = evictYarnMetadata(
    metadataDir,
    new URL(VERDACCIO_URL).hostname,
    names,
  );
  if (evicted > 0) {
    log(
      `Evicted ${evicted} local package metadata file(s) from ${metadataDir}`,
    );
  }

  const nodeModulesDir = resolve(workDir, "node_modules");
  const removed = removeInstalledCopies(nodeModulesDir, names);
  if (removed > 0) {
    log(`Removed ${removed} installed local package(s) from ${nodeModulesDir}`);
  }
}

/** The names of the monorepo packages Verdaccio may serve. */
function localPackageNames(): string[] {
  const packagesDir = resolve(ROOT_DIR, "packages");
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) =>
      existsSync(resolve(packagesDir, entry.name, "package.json")),
    )
    .map(
      (entry) =>
        JSON.parse(
          readFileSync(
            resolve(packagesDir, entry.name, "package.json"),
            "utf8",
          ),
        ) as { name: string; private?: boolean },
    )
    .filter((pkg) => pkg.private !== true)
    .map((pkg) => pkg.name);
}

/**
 * Delete Yarn Berry's cached registry metadata for `names` from every
 * directory named `registryHost` under `metadataDir` (laid out as
 * npm/<hash>/<host>/<file>), and return how many files were removed.
 */
export function evictYarnMetadata(
  metadataDir: string,
  registryHost: string,
  names: string[],
): number {
  if (!existsSync(metadataDir)) {
    return 0;
  }

  let removed = 0;
  for (const entry of readdirSync(metadataDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = resolve(metadataDir, entry.name);
    if (entry.name !== registryHost) {
      removed += evictYarnMetadata(dir, registryHost, names);
      continue;
    }
    for (const file of readdirSync(dir)) {
      if (isYarnMetadataEntryOf(file, names)) {
        rmSync(resolve(dir, file));
        removed++;
      }
    }
  }

  return removed;
}

/**
 * Berry's metadata file name for `name`: "hardhat.json" for an unscoped
 * package, "@scope-name-<scope length>.json" for a scoped one.
 */
function yarnMetadataFileName(name: string): string {
  const [scope, rest] = name.split("/");
  return rest === undefined
    ? `${name}.json`
    : `${scope}-${rest}-${scope.length - 1}.json`;
}

function isYarnMetadataEntryOf(file: string, names: string[]): boolean {
  return names.some((name) => yarnMetadataFileName(name) === file);
}

/**
 * Delete every copy of `names` under `nodeModulesDir`, at the top level and in
 * nested node_modules, and return how many were removed.
 */
export function removeInstalledCopies(
  nodeModulesDir: string,
  names: string[],
): number {
  if (!existsSync(nodeModulesDir)) {
    return 0;
  }

  let removed = 0;
  for (const name of names) {
    const dir = resolve(nodeModulesDir, name);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      removed++;
    }
  }

  for (const entry of readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    const packageDirs = entry.name.startsWith("@")
      ? readdirSync(resolve(nodeModulesDir, entry.name)).map((child) =>
          resolve(nodeModulesDir, entry.name, child),
        )
      : [resolve(nodeModulesDir, entry.name)];
    for (const packageDir of packageDirs) {
      removed += removeInstalledCopies(
        resolve(packageDir, "node_modules"),
        names,
      );
    }
  }

  return removed;
}

/**
 * Whether `file` is Yarn Berry's cache zip of an npm version of one of
 * `names`: "@scope/name" is slugged to "@scope-name-npm-<version>-…".
 */
export function isYarnCacheEntryOf(file: string, names: string[]): boolean {
  return names.some((name) =>
    file.startsWith(`${name.replace("/", "-")}-npm-`),
  );
}

/**
 * Environment for a scenario's package-manager run.
 *
 * Drops NPM_CONFIG_USERCONFIG. On GitHub CI setup-node writes a user-level
 * .npmrc holding `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` and
 * points that variable at it. This job never publishes, so the token is
 * unset. Yarn Classic treats a `${VAR}` it cannot expand in npm config as fatal
 * ("Failed to replace env in config") where npm and pnpm only warn, so every
 * yarn-Classic scenario died on `yarn add`. Scenario installs take their
 * registry from the config this harness writes, so ambient user config has
 * nothing to contribute. NODE_AUTH_TOKEN is defined too — the scenario env
 * wins, then the ambient value, else empty — for repos whose own committed
 * .npmrc names it (and for setup-node ≥v7, which registers a
 * $RUNNER_TEMP/.npmrc above the CI clone dir but no longer exports a
 * placeholder value for the variable it references).
 */
export function buildPackageManagerEnv(
  packageManager: ScenarioDefinition["packageManager"],
  scenarioEnv?: Record<string, string>,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    ...scenarioEnv,
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    NODE_AUTH_TOKEN:
      scenarioEnv?.NODE_AUTH_TOKEN ?? baseEnv.NODE_AUTH_TOKEN ?? "",
    ...(packageManager === "pnpm"
      ? {
          // The local packages (hardhat, @nomicfoundation/*) are published to
          // Verdaccio minutes before this runs; pnpm 11 defaults minimumReleaseAge
          // to one day and would block them.
          pnpm_config_minimum_release_age: "0",
          // pnpm 11 re-verifies every lockfile entry's tarball URL against the
          // active registry (ERR_PNPM_TARBALL_URL_MISMATCH). Scenario lockfiles
          // pin absolute registry.npmjs.org tarballs, but installing through
          // Verdaccio serves them from 127.0.0.1, so the check fails on entries
          // a targeted update doesn't touch. The scenario lockfile is a trusted
          // benchmark fixture, so trust it. Set as config (not a flag) so it
          // applies to both `pnpm install` and `pnpm update`.
          pnpm_config_trust_lockfile: "true",
        }
      : {
          // The local packages (hardhat, @nomicfoundation/*) are published to
          // Verdaccio minutes before this runs; so disable any release-age gate.
          npm_config_minimum_release_age: "0",
          // Yarn Classic doesn't honor project .yarnrc for `registry` on the
          // GitHub Actions runner, so force the registry via env var. This is
          // the highest-priority npm config source, so it overrides any
          // user/global .npmrc that might be present.
          npm_config_registry: VERDACCIO_URL,
        }),
  };

  delete env.NPM_CONFIG_USERCONFIG;
  delete env.npm_config_userconfig;

  return env;
}

/**
 * Build the package-manager-specific `install` args for a Verdaccio-backed
 * install.
 */
export function getInstallArgs(
  packageManager: ScenarioDefinition["packageManager"],
  registryUrl: string,
): string[] {
  // bun doesn't reliably read cwd `bunfig.toml`, so it needs the `--registry` CLI flag.
  // npm & pnpm don't strictly need `--registry` but we pass it for redundancy.
  // yarn is excluded because it rejects `--registry` as a CLI flag.
  return packageManager === "yarn"
    ? ["install"]
    : ["install", `--registry=${registryUrl}`];
}

/**
 * Build the package-manager-specific args to update `specs` (e.g.
 * `["hardhat@3.9.1"]`) against a Verdaccio-backed registry.
 */
export function getUpdateArgs(
  packageManager: ScenarioDefinition["packageManager"],
  specs: string[],
  registryUrl: string,
): string[] {
  switch (packageManager) {
    case "pnpm":
      return ["update", ...specs, `--registry=${registryUrl}`];
    case "npm":
      return ["install", ...specs, `--registry=${registryUrl}`];
    case "bun":
      return ["add", ...specs, `--registry=${registryUrl}`];
    case "yarn":
      // `yarn add` updates an existing dependency in both Classic and Berry;
      // the registry comes from .yarnrc.yml / npm_config_registry.
      return ["add", ...specs];
  }
}

function writeRegistryConfig(
  dir: string,
  packageManager: ScenarioDefinition["packageManager"],
): void {
  if (packageManager === "bun") {
    const bunfigPath = resolve(dir, "bunfig.toml");
    writeFileSync(bunfigPath, `[install]\nregistry = "${VERDACCIO_URL}"\n`);
    log(`Wrote bunfig.toml → ${VERDACCIO_URL}`);
  } else if (packageManager === "yarn") {
    // Yarn Berry reads `.yarnrc.yml`. Yarn Classic doesn't read it, but the
    // `npm_config_registry` env var passed at install time covers Classic.
    const yarnrcPath = resolve(dir, ".yarnrc.yml");

    let existing = "";
    try {
      existing = readFileSync(yarnrcPath, "utf-8");
    } catch {}

    // Strip any previously written registry settings so repeated
    // init calls stay idempotent.
    const cleaned = existing
      .replace(/^npmRegistryServer:.*\n?/m, "")
      .replace(/^unsafeHttpWhitelist:\n(?:\s+-.*\n?)*/m, "")
      .replace(/^enableHardenedMode:.*\n?/m, "");

    // Disable hardened mode (auto-enabled on GitHub CI) because it
    // refuses the lockfile drift that Verdaccio's republishes cause (YN0028).
    const registryConfig = `npmRegistryServer: "${VERDACCIO_URL}"\nunsafeHttpWhitelist:\n  - "localhost"\n  - "127.0.0.1"\nenableHardenedMode: false\n`;

    writeFileSync(
      yarnrcPath,
      cleaned.trim()
        ? `${cleaned.trimEnd()}\n\n${registryConfig}`
        : registryConfig,
    );

    log(`Wrote .yarnrc.yml → ${VERDACCIO_URL}`);
  } else {
    const npmrcPath = resolve(dir, ".npmrc");

    writeFileSync(npmrcPath, `registry=${VERDACCIO_URL}\n`);

    log(`Wrote .npmrc → ${VERDACCIO_URL}`);
  }
}
