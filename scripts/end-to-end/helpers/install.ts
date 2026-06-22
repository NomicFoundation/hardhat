import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { which } from "./shell.ts";
import { log, logStep } from "./log.ts";

import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
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
  }

  execFileSync(which(packageManager), args, {
    cwd: workDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
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
    },
  });
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
      .replace(/^unsafeHttpWhitelist:\n(?:\s+-.*\n?)*/m, "");

    const registryConfig = `npmRegistryServer: "${VERDACCIO_URL}"\nunsafeHttpWhitelist:\n  - "localhost"\n  - "127.0.0.1"\n`;

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
