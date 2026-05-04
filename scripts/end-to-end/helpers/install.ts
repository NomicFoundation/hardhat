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
  allowLockfileUpdates: boolean,
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

  logStep("Installing dependencies");

  const installArgs = getInstallArgs(
    packageManager,
    allowLockfileUpdates,
    VERDACCIO_URL,
  );

  execFileSync(which(packageManager), installArgs, {
    cwd: workDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      npm_config_minimum_release_age: "0",
      // Yarn Classic doesn't honor project .yarnrc for `registry` on the
      // GitHub Actions runner, so force the registry via env var. This is
      // the highest-priority npm config source, so it overrides any
      // user/global .npmrc that might be present.
      npm_config_registry: VERDACCIO_URL,
    },
  });
}

/**
 * Build the package-manager-specific `install` args for a Verdaccio-backed
 * install.
 *
 * `--use-local` patches the scenario's package.json, drifting the lockfile.
 * Since CI defaults to frozen-lockfile mode for pnpm and Yarn Berry, we allow
 * lockfile updates.
 */
export function getInstallArgs(
  packageManager: ScenarioDefinition["packageManager"],
  allowLockfileUpdates: boolean,
  registryUrl: string,
): string[] {
  // bun doesn't reliably read cwd `bunfig.toml`, so it needs the `--registry` CLI flag.
  // npm & pnpm don't strictly need `--registry` but we pass it for redundancy.
  // yarn is excluded because it rejects `--registry` as a CLI flag.
  const args =
    packageManager === "yarn"
      ? ["install"]
      : ["install", `--registry=${registryUrl}`];

  if (allowLockfileUpdates) {
    // npm install never freezes (only `npm ci` does), so it doesn't need any flag.
    if (packageManager === "pnpm" || packageManager === "bun") {
      args.push("--no-frozen-lockfile");
    } else if (packageManager === "yarn") {
      args.push("--no-immutable");
    }
  }

  return args;
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
