import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import { log } from "./log.ts";

/**
 * Create the directory a scenario runs in, and point it at Verdaccio.
 *
 * The directory is recreated on every run. That costs a full dependency
 * install each time and buys the guarantee that nothing passed on state left
 * behind by a previous run.
 *
 * Writing the `.npmrc` is the only setup the framework does. Everything else
 * is the scenario's own script, including the `--init` that fetches Hardhat
 * through this registry.
 */
export function prepareWorkspace(
  acceptanceDirectory: string,
  slug: string,
): string {
  const workingDir = resolve(acceptanceDirectory, slug);

  rmSync(workingDir, { recursive: true, force: true });
  mkdirSync(workingDir, { recursive: true });

  writeFileSync(join(workingDir, ".npmrc"), `registry=${VERDACCIO_URL}\n`);

  log(`${slug}: prepared ${workingDir}`);

  return workingDir;
}

/**
 * The environment every scenario script runs under.
 *
 * Colour is turned off at the source rather than only stripped afterwards, so
 * what a scenario prints is what the framework sees.
 */
export function scenarioEnv(): Record<string, string> {
  return {
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    // The block's first command is `npx`, which fetches Hardhat itself,
    // before anything has read the .npmrc.
    npm_config_registry: VERDACCIO_URL,
    // Our packages reach Verdaccio seconds before a scenario installs them.
    // npm does not know this setting (it warns), so it is set for pnpm only.
    pnpm_config_minimum_release_age: "0",
  };
}
