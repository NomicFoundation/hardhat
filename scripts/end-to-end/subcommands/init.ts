import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { installDependencies, updateDependencies } from "../helpers/install.ts";
import { git, which, ROOT_DIR } from "../helpers/shell.ts";
import { fmt, log, logStep, logWarning } from "../helpers/log.ts";
import {
  isVerdaccioRunning,
  VERDACCIO_URL,
} from "../../verdaccio/helpers/shell.ts";
import { loadScenario } from "../helpers/directory.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import {
  publish as verdaccioPublish,
  sinceReleasePublish,
} from "../../verdaccio/publish.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";
import type { Scenario } from "../types.ts";

export const ForceCheckout = {
  Yes: "Yes",
  No: "No",
} as const;

/**
 * Enum for whether to force checkout in git operations.
 *
 * Used to avoid mixing boolean flags with different semantics
 * (e.g. --force-publish).
 */
export type ForceCheckout = (typeof ForceCheckout)[keyof typeof ForceCheckout];

export const ForcePublish = {
  Yes: "Yes",
  No: "No",
} as const;

/**
 * Enum for whether to force publish packages to an already-running
 * Verdaccio instance.
 *
 * Used to avoid mixing boolean flags with different semantics
 * (e.g. --force-checkout).
 */
export type ForcePublish = (typeof ForcePublish)[keyof typeof ForcePublish];

export const UseLocal = {
  Yes: "Yes",
  No: "No",
} as const;

/**
 * Enum for whether to detect local package changes, publish to Verdaccio, and
 * pin scenario dependencies to the published versions. Only applies when init runs.
 *
 * Used to avoid mixing boolean flags with different semantics
 * (e.g. --force-checkout).
 */
export type UseLocal = (typeof UseLocal)[keyof typeof UseLocal];

export async function init(
  e2eCloneDirectory: string,
  scenarioPath: string,
  useLocal: UseLocal,
  forceCheckout: ForceCheckout,
  forcePublish: ForcePublish,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (scenario.definition.disabled === true) {
    logWarning(`Scenario "${scenario.id}" is disabled, skipping`);

    return;
  }

  const verdaccioAlreadyRunning = isVerdaccioRunning();

  if (
    useLocal === UseLocal.Yes &&
    verdaccioAlreadyRunning &&
    forcePublish === ForcePublish.No
  ) {
    log(
      "A Verdaccio instance is already running. Skipping --use-local's\n" +
        "  bump-and-publish step — the scenario will use whatever the running\n" +
        "  registry already contains.\n\n" +
        "  To force a fresh bump-and-publish to the running instance, pass\n" +
        "  --force-publish. Or stop the running instance first:\n" +
        "    pnpm verdaccio stop",
    );
  }

  if (!verdaccioAlreadyRunning) {
    await verdaccioStart(true);
  }

  const startedVerdaccio = !verdaccioAlreadyRunning;
  if (startedVerdaccio || forcePublish === ForcePublish.Yes) {
    if (useLocal === UseLocal.Yes) {
      sinceReleasePublish();
    } else {
      verdaccioPublish(false, true);
    }
  }

  try {
    setupScenario(scenario, forceCheckout);

    if (useLocal === UseLocal.Yes) {
      await updateLocalDependencies(scenario);
    }

    installScenarioDeps(scenario);
  } finally {
    if (startedVerdaccio) {
      verdaccioStop();
    }
  }

  log("Scenario initialization complete, working directory setup:");
  log(`  cd ${scenario.workingDir}`);
}

/**
 * Clone/setup a scenario repo and run preinstall scripts.
 * Idempotent: reuses existing checkouts (fetch + checkout + clean).
 */
function setupScenario(scenario: Scenario, forceCheckout: ForceCheckout): void {
  const { scenarioDir, workingDir, definition } = scenario;
  const submodules = definition.submodules ?? false;

  if (!existsSync(workingDir)) {
    // Fresh clone flow
    clone(workingDir, definition.repo);
    checkout(workingDir, definition.commit, forceCheckout);

    if (submodules) {
      updateSubmodules(workingDir);
    }
  } else {
    // Re-init flow
    fetch(workingDir, definition.repo, definition.commit);
    checkout(workingDir, definition.commit, forceCheckout);
    clean(workingDir);

    if (submodules) {
      updateSubmodules(workingDir);
    }
  }

  if (definition.preinstall !== undefined) {
    runPreinstallScript(
      resolve(scenarioDir, definition.preinstall),
      scenarioDir,
      workingDir,
      definition.env,
    );
  }
}

/**
 * Install dependencies using the scenario's package manager or custom
 * install script.
 */
function installScenarioDeps(scenario: Scenario): void {
  const { scenarioDir, workingDir, definition } = scenario;

  if (definition.install !== undefined) {
    runCustomInstallScript(
      resolve(scenarioDir, definition.install),
      scenarioDir,
      workingDir,
      definition.env,
    );
  } else {
    installDependencies(workingDir, definition.packageManager, definition.env);
  }
}

/**
 * Update the scenario's hardhat / @nomicfoundation/* dependencies to the latest
 * versions available in Verdaccio using the scenario's package manager. A
 * targeted update writes package.json and the lockfile together and installs,
 * without re-resolving the rest of the tree — so it can't split a shared
 * transitive dependency across versions.
 */
async function updateLocalDependencies(scenario: Scenario): Promise<void> {
  logStep("Updating local dependencies to latest Verdaccio versions");

  const pkgJsonPath = resolve(scenario.workingDir, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

  const specs: string[] = [];

  for (const depField of ["dependencies", "devDependencies"] as const) {
    const deps = pkgJson[depField] as Record<string, string> | undefined;

    if (deps === undefined) {
      continue;
    }

    for (const name of Object.keys(deps)) {
      if (name !== "hardhat" && !name.startsWith("@nomicfoundation/")) {
        continue;
      }

      const version = await getLatestFromVerdaccio(name);

      if (version !== undefined) {
        specs.push(`${name}@${version}`);
        log(`  ${fmt.pkg(name)} → ${fmt.version(version)}`);
      }
    }
  }

  if (specs.length === 0) {
    // Nothing to bump; the unconditional installScenarioDeps below realizes
    // node_modules.
    log("No matching dependencies to update");
    return;
  }

  const { workingDir, definition } = scenario;

  updateDependencies(
    workingDir,
    definition.packageManager,
    specs,
    definition.env,
  );
}

const VERDACCIO_FETCH_ATTEMPTS = 4;
const VERDACCIO_FETCH_RETRY_DELAY_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve a package's `dist-tags.latest` from Verdaccio.
 *
 * Returns `undefined` only when the package genuinely isn't in the registry
 * (404).
 *
 * A transient connection failure is retried. Sometimes a scenario's recursive
 * submodule clone burst momentarily exhausts the runner's sockets / ephemeral
 * ports right before this fetch runs, which makes the localhost request throw
 * `fetch failed`. If the failure persists this throws, so the scenario fails
 * loudly instead of silently benchmarking out-of-date code.
 */
async function getLatestFromVerdaccio(
  packageName: string,
): Promise<string | undefined> {
  const url = `${VERDACCIO_URL}/${packageName}`;

  for (let attempt = 1; attempt <= VERDACCIO_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await globalThis.fetch(url);

      // A genuine "not in the registry" answer — don't retry, don't fail.
      if (response.status === 404) {
        return undefined;
      }

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const metadata = (await response.json()) as {
        "dist-tags"?: { latest?: string };
      };

      const latest = metadata["dist-tags"]?.latest;

      if (latest === undefined) {
        throw new Error(
          `Verdaccio returned no \`dist-tags.latest\` for ${packageName} (GET ${url})`,
        );
      }

      return latest;
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.cause instanceof Error
            ? `${error.message} (${error.cause.message})`
            : error.message
          : String(error);

      if (attempt < VERDACCIO_FETCH_ATTEMPTS) {
        logWarning(
          `GET ${url} failed (attempt ${attempt}/${VERDACCIO_FETCH_ATTEMPTS}): ` +
            `${reason}; retrying in ${VERDACCIO_FETCH_RETRY_DELAY_MS}ms`,
        );
        await sleep(VERDACCIO_FETCH_RETRY_DELAY_MS);
        continue;
      }

      throw new Error(
        `Could not resolve latest ${packageName} from Verdaccio after ` +
          `${VERDACCIO_FETCH_ATTEMPTS} attempts: GET ${url} failed: ${reason}`,
        { cause: error },
      );
    }
  }

  // Unreachable: the loop returns or throws on the final attempt.
  throw new Error(`Could not resolve latest ${packageName} from Verdaccio`);
}

function clone(scenarioWorkingDir: string, repo: string): void {
  logStep(`Cloning ${repo}`);

  git(
    ["clone", `https://github.com/${repo}.git`, scenarioWorkingDir],
    ROOT_DIR,
  );
}

function fetch(scenarioWorkingDir: string, repo: string, commit: string): void {
  logStep(`Fetching ${repo}`);

  // Fetch the specific commit by SHA so that the checkout below succeeds even
  // if the commit is no longer the tip of any branch (e.g. after a force-push
  // that orphaned the previously-fetched commits, or when the SHA points at
  // an intermediate commit on a long-lived branch).
  git(["fetch", "origin", commit], scenarioWorkingDir);
}

function updateSubmodules(scenarioWorkingDir: string): void {
  logStep("Updating submodules");

  git(["submodule", "update", "--init", "--recursive"], scenarioWorkingDir);
}

function checkout(
  scenarioWorkingDir: string,
  commit: string,
  force: ForceCheckout,
): void {
  logStep(`Checking out ${commit}`);

  const args = ["checkout", commit];
  if (force === ForceCheckout.Yes) {
    args.push("--force");
  }
  git(args, scenarioWorkingDir);
}

function clean(scenarioWorkingDir: string): void {
  logStep("Cleaning working tree");

  git(["checkout", "."], scenarioWorkingDir);
  git(["clean", "-fdx"], scenarioWorkingDir);
}

function runPreinstallScript(
  scriptPath: string,
  scenarioDir: string,
  workingDir: string,
  env?: Record<string, string>,
): void {
  logStep("Running preinstall script");

  execFileSync(which("bash"), [scriptPath], {
    cwd: workingDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      E2E_TEST_DIR: scenarioDir,
    },
  });
}

function runCustomInstallScript(
  scriptPath: string,
  testDir: string,
  workDir: string,
  env?: Record<string, string>,
): void {
  logStep("Running custom install script");

  execFileSync(which("bash"), [scriptPath], {
    cwd: workDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      E2E_REPO_DIR: workDir,
      E2E_TEST_DIR: testDir,
    },
  });
}
