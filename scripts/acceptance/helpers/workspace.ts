import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import { log } from "./log.ts";
import type { Cell } from "./scenario.ts";

/** Where a run keeps the package managers' caches, under the acceptance dir. */
const CACHE_DIRECTORY = ".cache";

/**
 * Create the directory a cell runs in, and point it at Verdaccio.
 *
 * The directory is recreated on every run. That costs a full dependency
 * install each time and buys the guarantee that nothing passed on state left
 * behind by a previous run.
 *
 * Writing the registry config is the only setup the framework does.
 * Everything else is the scenario's own script, including the `--init` that
 * fetches Hardhat through this registry. npm, pnpm and bun all read `.npmrc`;
 * bun also gets a `bunfig.toml`, which is its own.
 */
export function prepareWorkspace(
  acceptanceDirectory: string,
  cell: Cell,
): string {
  const workingDir = resolve(acceptanceDirectory, cell.directory);

  rmSync(workingDir, { recursive: true, force: true });
  mkdirSync(workingDir, { recursive: true });

  writeFileSync(join(workingDir, ".npmrc"), `registry=${VERDACCIO_URL}\n`);

  if (cell.packageManager === "bun") {
    writeFileSync(
      join(workingDir, "bunfig.toml"),
      `[install]\nregistry = "${VERDACCIO_URL}"\n`,
    );
  }

  log(`${cell.label}: prepared ${workingDir}`);

  return workingDir;
}

/**
 * Remove everything a previous run left of a scenario, before any of its
 * cells is prepared.
 *
 * Recreating each cell's directory is not enough: a cell runs beneath the
 * scenario's directory, `<slug>/<package manager>`, and Hardhat looks for a
 * config in every directory above the one it runs in. A project a previous
 * run left at `<slug>` itself, as a literal scenario does, would make every
 * cell's `--init` refuse with HHE10.
 */
export function clearScenarioDirectory(
  acceptanceDirectory: string,
  slug: string,
): void {
  rmSync(resolve(acceptanceDirectory, slug), { recursive: true, force: true });
  rmSync(resolve(acceptanceDirectory, `${slug}.sh`), { force: true });
}

/**
 * Give this run empty package manager caches, and return where they are.
 *
 * Every launcher caches what it fetches: npx under npm's cache, `pnpm dlx`
 * under pnpm's, `bunx` under bun's. A cache keyed by name and version cannot
 * tell our build from the release of the same version, so a shared one can
 * hand a scenario the Hardhat from npm while reporting it green. The caches
 * are shared between the cells of one run, which all install the same build,
 * and recreated for the next.
 */
export function prepareCaches(acceptanceDirectory: string): string {
  const cacheDir = resolve(acceptanceDirectory, CACHE_DIRECTORY);

  rmSync(cacheDir, { recursive: true, force: true });
  mkdirSync(cacheDir, { recursive: true });

  return cacheDir;
}

/**
 * The environment a cell's script runs under.
 *
 * It starts from this process's environment without any `npm_*` variable.
 * `pnpm acceptance` runs under pnpm, which sets `npm_config_user_agent`, and
 * `--init` picks its package manager from that variable, so inheriting it
 * would have every scenario install with pnpm whatever launched Hardhat. With
 * it gone, the launcher the scenario uses decides, as it does for a user.
 *
 * Colour is turned off at the source rather than only stripped afterwards, so
 * what a scenario prints is what the framework sees.
 */
export function scenarioEnv(cacheDir: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !/^npm_/i.test(key)) {
      env[key] = value;
    }
  }

  return {
    ...env,
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    // The launcher fetches Hardhat itself, before anything reads the .npmrc.
    npm_config_registry: VERDACCIO_URL,
    BUN_CONFIG_REGISTRY: VERDACCIO_URL,
    // Our packages reach Verdaccio seconds before a scenario installs them.
    // npm does not know this setting (it warns), so it is set for pnpm only.
    pnpm_config_minimum_release_age: "0",
    npm_config_cache: join(cacheDir, "npm"),
    pnpm_config_store_dir: join(cacheDir, "pnpm-store"),
    pnpm_config_cache_dir: join(cacheDir, "pnpm-cache"),
    BUN_INSTALL_CACHE_DIR: join(cacheDir, "bun"),
  };
}
