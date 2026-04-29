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

  const installArgs =
    packageManager === "yarn"
      ? ["install"]
      : // Required by bun as it may not pickup the cwd bunfig.toml
        ["install", `--registry=${VERDACCIO_URL}`];

  if (allowLockfileUpdates) {
    // --use-local patches package.json to versions published in Verdaccio,
    // which drifts the lockfile. Override CI's default frozen-lockfile
    // behaviour so the install can update it. npm install does not freeze
    // the lockfile (only `npm ci` does), so it needs no flag.
    if (packageManager === "pnpm" || packageManager === "bun") {
      installArgs.push("--no-frozen-lockfile");
    } else if (packageManager === "yarn") {
      installArgs.push("--no-immutable");
    }
  }

  execFileSync(which(packageManager), installArgs, {
    cwd: workDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      npm_config_minimum_release_age: "0",
    },
  });
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
